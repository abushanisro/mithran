import { CalculatorBuilder } from '@/components/features/calculators/builder/CalculatorBuilder';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CalculatorBuilderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 p-6">
      <CalculatorBuilder calculatorId={id} />
    </div>
  );
}
