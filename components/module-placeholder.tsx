import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold text-copy-primary">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This module hasn&apos;t been built yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-copy-muted">
            {title} will live here once its feature spec is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
