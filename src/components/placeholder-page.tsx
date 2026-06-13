interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl text-stone-900">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">
        {description ?? "Coming in a future stage."}
      </p>
    </div>
  );
}
