# Open Agent Platform

> [!WARNING]
> This platform is currently a work in progress and is not ready for production use.

# Setup

## Deployments

To add deployments to the platform, add them to the `NEXT_PUBLIC_DEPLOYMENTS` environment variable.

The environment variable should be a JSON array of objects with the following shape:

```json
{
  "id": "<string>",
  "deploymentUrl": "<string>",
  "tenantId": "<string>",
  "name": "<string>"
}
```

- `id`: The ID of the deployment.
- `deploymentUrl`: The API URL of the deployment.
- `tenantId`: The tenant ID the deployment belongs to.
- `name`: A custom name for the deployment. This is a custom field you need to set.

We have a convenience page you can use to get the deployment information for your deployments. Visit `/onboarding/deployments` in the platform, where you can paste in the deployment URLs and custom names, and it will return the full environment variable string needed to add the deployment to the platform.

## Tools

To add custom tools to the platform, add them to the `NEXT_PUBLIC_TOOLS` environment variable.

The environment variable should be a JSON array of objects with the following shape:

```json
{
  "id": "<string>",
  "name": "<string>",
  "description": "<string>",
  "url": "<string>",
  "schema": "<string>"
}
```

- `id`: The ID of the tool. This is a unique v4 UUID.
- `name`: The name of the tool. This is a custom field you need to set.
- `description`: A description of the tool. This is a custom field you need to set.
- `url`: The URL the tool server is deployed on.
- `schema`: The schema of the tool. This must be a valid JSON schema.

We have a convenience page you can use to get the tool information for your tools. Visit `/onboarding/tools` in the platform, where you can fill out a form for each of your tools, and it will return the full environment variable string needed to add the tool to the platform.
