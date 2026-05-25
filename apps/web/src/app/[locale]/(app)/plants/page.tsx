import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantCard } from '@/components/plants/plant-card';
import { getAccessToken } from '@/lib/auth/cookies';

async function getPlants() {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/plants?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const response = await res.json();
    const plants = response.data?.plants;
    return Array.isArray(plants) ? plants : [];
  } catch {
    return [];
  }
}

export default async function PlantsPage() {
  const plants = await getPlants();

  return (
    <div className="min-h-[calc(100vh-4rem-16rem)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Plants</h1>
            <p className="text-gray-600">Manage your plant collection</p>
          </div>
          <Button asChild>
            <Link href="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Plant
            </Link>
          </Button>
        </div>

        {plants.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No plants yet. Create your first plant!</p>
            <Button asChild>
              <Link href="new">Add Your First Plant</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
