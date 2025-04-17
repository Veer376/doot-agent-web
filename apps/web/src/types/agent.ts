/**
 * A custom "agent". These are assistants tied to LangGraph deployments
 * with some configurable fields set.
 */
export interface Agent<
  Configurable extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * The date the agent was created at. String in ISO format.
   */
  createdAt: string;
  /**
   * The date the agent was last updated at. String in ISO format.
   */
  updatedAt: string;
  /**
   * The agents ID. This is also the assistant ID from the
   * graph the agent is representing
   */
  id: string;
  /**
   * The ID of the user the agent was created by.
   * Optional, if created by an admin, or is a default agent.
   */
  createdBy?: string;
  /**
   * The user provided name of the agent.
   * Defaults to three verbs + "agent"
   */
  name: string;
  /**
   * The user provided description of the agent.
   * Optional.
   */
  description?: string;
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
