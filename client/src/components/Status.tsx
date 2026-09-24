import type { ReactNode } from "react";

export function LoadingState({ message }: { message: string }) {
  return <p className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">{message}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
