/**
 * A custom "agent". These are assistants tied to LangGraph deployments
 * with some configurable fields set.
 */
export interface Agent<
  Configurable extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * The agents ID. This is also the assistant ID from the
   * graph the agent is representing
   */
  id: string;
  /**
   * The user provided name of the agent.
   * Defaults to three verbs + "agent"
   */
  name: string;
  /**
   * The user provided description of the agent.
   * Optional.
   */
  description: string | undefined;
  /**
   * The deployment URL of the LangGraph deployment
   * this agent belongs to.
   */
  deploymentUrl: string;
  /**
   * The configurable fields the agent has set.
   */
  configurable: Configurable;
}
