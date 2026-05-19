import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "hello-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "say_hi",
  {
    description: "Return a simple greeting.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Hi from MCP!",
      },
    ],
  }),
);

server.registerTool(
  "add_numbers",
  {
    description: "Use this tool whenever the user asks for arithmetic addition.",
    inputSchema: {
      a: z.number().describe("The first number to add."),
      b: z.number().describe("The second number to add."),
    },
  },
  async ({ a, b }) => ({
    content: [
      {
        type: "text",
        text: String(a + b),
      },
    ],
  }),
);

server.registerTool(
  "get_post",
  {
    description: "Fetch a post by ID and return its title and body as text.",
    inputSchema: {
      id: z.number().describe("The post ID to fetch."),
    },
  },
  async ({ id }) => {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${id}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch post ${id}: ${response.status}`);
    }

    const post = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `${post.title}\n\n${post.body}`,
        },
      ],
    };
  },
);

server.registerTool(
  "get_weather",
  {
    description:
      "Fetch the current weather for a city and return the city name, temperature, and wind speed.",
    inputSchema: {
      city: z.string().describe("The city to fetch weather for."),
    },
  },
  async ({ city }) => {
    const geocodingResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
    );

    if (!geocodingResponse.ok) {
      throw new Error(`Failed to geocode city "${city}": ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    const location = geocodingData.results?.[0];

    if (!location) {
      throw new Error(`City not found: ${city}`);
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,wind_speed_10m`,
    );

    if (!weatherResponse.ok) {
      throw new Error(
        `Failed to fetch weather for "${location.name}": ${weatherResponse.status}`,
      );
    }

    const weather = await weatherResponse.json();
    const current = weather.current;

    return {
      content: [
        {
          type: "text",
          text:
            `City: ${location.name}\n` +
            `Temperature: ${current.temperature_2m} ${weather.current_units.temperature_2m}\n` +
            `Wind Speed: ${current.wind_speed_10m} ${weather.current_units.wind_speed_10m}`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();

try {
  await server.connect(transport);
} catch (error) {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
}
