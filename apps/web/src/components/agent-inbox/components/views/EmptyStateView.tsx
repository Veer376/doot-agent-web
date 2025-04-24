interface EmptyStateViewProps {
  // Component might be extended with additional props in the future
  _unused?: boolean;
}

export function EmptyStateView(_props: EmptyStateViewProps) {
  return <div className="p-6 text-gray-500">No state found</div>;
}
