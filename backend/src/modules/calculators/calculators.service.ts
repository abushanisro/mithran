import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '../../common/logger/logger.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { evaluate } from 'mathjs';
import { CreateCalculatorDto, UpdateCalculatorDto, QueryCalculatorDto, ExecuteCalculatorDto } from './dto/calculator.dto';

@Injectable()
export class CalculatorsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: Logger,
  ) { }

  async findAll(query: QueryCalculatorDto, userId: string, accessToken: string) {
    this.logger.log('Fetching all calculators', 'CalculatorsService');

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let queryBuilder = this.supabaseService
      .getClient(accessToken)
      .from('calculators')
      .select('*, fields:calculator_fields(*), formulas:calculator_formulas(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    if (query.calcCategory) {
      queryBuilder = queryBuilder.eq('calc_category', query.calcCategory);
    }

    if (query.calculatorType) {
      queryBuilder = queryBuilder.eq('calculator_type', query.calculatorType);
    }

    if (query.isTemplate !== undefined) {
      queryBuilder = queryBuilder.eq('is_template', query.isTemplate);
    }

    if (query.isPublic !== undefined) {
      queryBuilder = queryBuilder.eq('is_public', query.isPublic);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(`Failed to fetch calculators: ${error.message}`, 'CalculatorsService');
      throw new Error(error.message);
    }

    return {
      calculators: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, accessToken: string) {
    this.logger.log(`Fetching calculator: ${id}`, 'CalculatorsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('calculators')
      .select('*, fields:calculator_fields(*), formulas:calculator_formulas(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Calculator not found: ${id}`);
    }

    return data;
  }

  async create(dto: CreateCalculatorDto, userId: string, accessToken: string) {
    this.logger.log(`Creating calculator: ${dto.name}`, 'CalculatorsService');

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('calculators')
      .insert({
        user_id: userId,
        name: dto.name,
        description: dto.description,
        calc_category: dto.calcCategory,
        calculator_type: dto.calculatorType,
        is_template: dto.isTemplate || false,
        is_public: dto.isPublic || false,
        template_category: dto.templateCategory,
        display_config: dto.displayConfig || {},
      })
      .select('*, fields:calculator_fields(*), formulas:calculator_formulas(*)')
      .single();

    if (error) {
      this.logger.error(`Failed to create calculator: ${error.message}`, 'CalculatorsService');
      throw new Error(error.message);
    }

    return data;
  }

  async update(id: string, dto: UpdateCalculatorDto, userId: string, accessToken: string) {
    this.logger.log(`Updating calculator: ${id}`, 'CalculatorsService');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.calcCategory !== undefined) updateData.calc_category = dto.calcCategory;
    if (dto.calculatorType !== undefined) updateData.calculator_type = dto.calculatorType;
    if (dto.isTemplate !== undefined) updateData.is_template = dto.isTemplate;
    if (dto.isPublic !== undefined) updateData.is_public = dto.isPublic;
    if (dto.templateCategory !== undefined) updateData.template_category = dto.templateCategory;
    if (dto.displayConfig !== undefined) updateData.display_config = dto.displayConfig;

    const { data, error } = await this.supabaseService
      .getClient(accessToken)
      .from('calculators')
      .update(updateData)
      .eq('id', id)
      .select('*, fields:calculator_fields(*), formulas:calculator_formulas(*)')
      .single();

    if (error || !data) {
      throw new NotFoundException(`Calculator not found: ${id}`);
    }

    return data;
  }

  async remove(id: string, userId: string, accessToken: string) {
    this.logger.log(`Deleting calculator: ${id}`, 'CalculatorsService');

    const { error } = await this.supabaseService
      .getClient(accessToken)
      .from('calculators')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete calculator: ${error.message}`, 'CalculatorsService');
      throw new Error(error.message);
    }

    return { message: 'Calculator deleted successfully' };
  }

  async execute(id: string, dto: ExecuteCalculatorDto, userId: string, accessToken: string) {
    this.logger.log(`Executing calculator: ${id}`, 'CalculatorsService');

    const calculator = await this.findOne(id, userId, accessToken);
    const { formulas, fields } = calculator;

    // Create a scope with input values
    const scope: Record<string, any> = { ...dto.inputValues };

    // Normalize scope: Ensure field names are available as variables
    if (fields && Array.isArray(fields)) {
      fields.forEach((field: any) => {
        // value can be in inputValues under id or field_name
        const val =
          dto.inputValues[field.id] !== undefined
            ? dto.inputValues[field.id]
            : dto.inputValues[field.field_name];

        if (val !== undefined && field.field_name) {
          // Parse number if needed (most calculator fields are numbers)
          // If field_type is text, keep as is
          if (field.field_type === 'number' || !isNaN(Number(val))) {
            const num = Number(val);
            scope[field.field_name] = num;
          } else {
            scope[field.field_name] = val;
          }
        }
      });
    }

    // Sort formulas by execution order
    const sortedFormulas = (formulas || []).sort(
      (a: any, b: any) => (a.execution_order || 0) - (b.execution_order || 0),
    );

    const results: Record<string, any> = {};
    const startTime = Date.now();

    for (const formula of sortedFormulas) {
      try {
        if (!formula.formula_expression) continue;

        // Evaluate formula
        // We use the scope which accumulates results from previous formulas
        const result = evaluate(formula.formula_expression, scope);

        // Store result in scope for subsequent formulas
        if (formula.formula_name) {
          scope[formula.formula_name] = result;
        }

        // Store result for response
        results[formula.id] = result;
        if (formula.formula_name) {
          results[formula.formula_name] = result;
        }
      } catch (e) {
        this.logger.error(
          `Error calculating formula ${formula.formula_name || 'unknown'}: ${e.message}`,
          'CalculatorsService',
        );
        results[formula.id] = { error: e.message, value: null };
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      results,
      durationMs: duration,
    };
  }
}
