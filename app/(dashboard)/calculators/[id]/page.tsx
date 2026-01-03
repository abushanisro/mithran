import { CalculatorExecutor } from '@/components/features/calculators/executor/CalculatorExecutor';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CalculatorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 p-6">
      <CalculatorExecutor calculatorId={id} />
    </div>
  );
}
