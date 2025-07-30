import dynamic from 'next/dynamic';

const OptimizedCuttingStockApp = dynamic(
  () => import('../src/components/OptimizedCuttingStockApp').then(mod => mod.OptimizedCuttingStockApp),
  { ssr: false }
);

export default function Home() {
  return <OptimizedCuttingStockApp />;
}