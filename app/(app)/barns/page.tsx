import { createClient } from "@/lib/supabase/server";
import { BarnFormDialog } from "@/components/barns/barn-form-dialog";
import { DeleteBarnDialog } from "@/components/barns/delete-barn-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BarnsPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner's barns only.
  const { data: barns } = await supabase.from("barns").select("*").order("name");

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Barns</h1>
        <BarnFormDialog triggerLabel="Add Barn" triggerIcon />
      </div>

      {!barns || barns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No barns yet</CardTitle>
            <CardDescription>
              Add your first barn to start organizing the farm.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barns.map((barn) => (
            <Card key={barn.id}>
              <CardHeader>
                <CardTitle>{barn.name}</CardTitle>
                {barn.category && (
                  <CardDescription>{barn.category}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {barn.notes && (
                  <p className="text-sm text-copy-secondary">{barn.notes}</p>
                )}
                <div className="flex gap-2">
                  <BarnFormDialog
                    barn={barn}
                    triggerLabel="Edit"
                    triggerVariant="outline"
                    triggerSize="sm"
                  />
                  <DeleteBarnDialog barnId={barn.id} barnName={barn.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
