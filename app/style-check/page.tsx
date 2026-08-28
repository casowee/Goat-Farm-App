import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function StyleCheckPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-copy-primary">
          Design System Check
        </h1>
        <p className="text-copy-muted">
          One of each base component, rendered on the desert theme.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="default">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nubian Doe #14</CardTitle>
          <CardDescription>Barn 2 &middot; Doe &middot; 3 years</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-copy-secondary">
            A sample card rendered with the desert theme tokens.
          </p>
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger render={<Button variant="default">Open Dialog</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Health Record</DialogTitle>
            <DialogDescription>
              A dialog rendered with the desert theme tokens.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-copy-secondary" htmlFor="goat-name">
          Goat name
        </label>
        <Input id="goat-name" placeholder="e.g. Willow" />
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
        </TabsList>
        <TabsContent value="health">Health records go here.</TabsContent>
        <TabsContent value="breeding">Breeding records go here.</TabsContent>
        <TabsContent value="weight">Weight records go here.</TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-copy-secondary" htmlFor="notes">
          Notes
        </label>
        <Textarea id="notes" placeholder="Add a note about this goat..." />
      </div>

      <div>
        <p className="mb-2 text-sm text-copy-secondary">Recent activity</p>
        <ScrollArea className="h-32 rounded-2xl border border-surface-border bg-surface p-3">
          <ul className="flex flex-col gap-2 text-sm text-copy-secondary">
            {Array.from({ length: 12 }).map((_, i) => (
              <li key={i}>Log entry {i + 1}</li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </main>
  );
}
