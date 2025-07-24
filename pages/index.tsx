import dynamic from 'next/dynamic';

const CuttingStockApp = dynamic(
  () => import('../src/components/CuttingStockApp').then(mod => mod.CuttingStockApp),
  { ssr: false }
);

export default function Home() {
  return <CuttingStockApp />;
}