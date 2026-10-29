import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Agent } from "@/types/agent";
import { groupAgentsByGraphs, isPrimaryAgent } from "@/lib/agent-utils";
import _ from "lodash";
import { cn } from "@/lib/utils";

interface GraphSelectProps {
  selectedGraph: Agent | undefined;
  setSelectedGraph: (graph: Agent | undefined) => void;
  agents: Agent[];
  className?: string;
}

export function GraphSelect({
  selectedGraph,
  setSelectedGraph,
  agents,
  className,
}: GraphSelectProps) {
  const agentsGroupedByGraphs = groupAgentsByGraphs(agents);

  const graphs = agentsGroupedByGraphs.flatMap(
    (group) => group.find((g) => isPrimaryAgent(g)) ?? [],
  );

  // const getDeploymentSpan = (deploymentId: string) => {
  //   const deployment = deployments.find((d) => d.id === deploymentId);
  //   if (!deployment) return null;
  //   return <span className="text-muted-foreground">[{deployment.name}]</span>;
  // };

  return (
    <Select
      value={selectedGraph ? selectedGraph.graph_id : ""}
      onValueChange={(graphId) => {
        if (!graphId) {
          setSelectedGraph(undefined);
          return;
        }
        const graph = agents.find((g) => g.graph_id === graphId);
        if (!graph) return;
        setSelectedGraph(graph);
      }}
    >
      <SelectTrigger
        className={cn(className)}
        data-radius="control"
      >
        <SelectValue placeholder="Select a graph" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {graphs.map((graph) => (
            <SelectItem
              className="flex items-center gap-1"
              key={graph.graph_id}
              value={graph.graph_id}
            >
              {/* {getDeploymentSpan(graph.deploymentId)}{" "} */}
              {_.startCase(graph.graph_id)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
