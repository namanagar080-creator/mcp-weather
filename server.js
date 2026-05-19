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

server.registerTool(
  "read_file",
  {
    description: "Read a local file and return its contents as text.",
    inputSchema: {
      path: z.string().describe("The path of the file to read."),
    },
  },
  async ({ path }) => {
    const { readFile } = await import("fs/promises");
    const text = await readFile(path, "utf8");

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);

server.registerTool(
  "list_files",
  {
    description: "List all files and folders in a local directory as text.",
    inputSchema: {
      path: z.string().describe("The path of the directory to list."),
    },
  },
  async ({ path }) => {
    const { readdir } = await import("fs/promises");
    const entries = await readdir(path, { withFileTypes: true });
    const text = entries
      .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);

server.registerTool(
  "write_file",
  {
    description: "Write text content to a local file using UTF-8 encoding.",
    inputSchema: {
      path: z.string().describe("The path of the file to write."),
      content: z.string().describe("The UTF-8 text content to write."),
    },
  },
  async ({ path, content }) => {
    const { writeFile } = await import("fs/promises");
    await writeFile(path, content, "utf8");

    return {
      content: [
        {
          type: "text",
          text: `Successfully wrote file: ${path}`,
        },
      ],
    };
  },
);

server.registerTool(
  "delete_file",
  {
    description: "Delete a local file and return a success message.",
    inputSchema: {
      path: z.string().describe("The path of the file to delete."),
    },
  },
  async ({ path }) => {
    const { unlink } = await import("fs/promises");

    try {
      await unlink(path);
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`File does not exist: ${path}`);
      }

      throw error;
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted file: ${path}`,
        },
      ],
    };
  },
);

server.registerTool(
  "get_expenses",
  {
    description:
      "Fetch all expenses and return them as formatted text.",
    inputSchema: {},
  },
  async () => {
    const response = await fetch("http://localhost:8080/expenses");

    if (!response.ok) {
      throw new Error(`Failed to fetch expenses: ${response.status}`);
    }

    const expenses = await response.json();

    const text = Array.isArray(expenses) && expenses.length > 0
      ? expenses
          .map((expense, index) => {
            const fields = Object.entries(expense)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n");

            return `Expense ${index + 1}\n${fields}`;
          })
          .join("\n\n")
      : "No expenses found.";

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);

server.registerTool(
  "update_expense",
  {
    description: "Update an expense by ID and return the updated expense info.",
    inputSchema: {
      id: z.number().describe("The ID of the expense to update."),
      title: z.string().describe("The updated title for the expense."),
      amount: z.number().describe("The updated amount for the expense."),
    },
  },
  async ({ id, title, amount }) => {
    const response = await fetch(`http://localhost:8080/expenses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update expense ${id}: ${response.status}`);
    }

    const updatedExpenseSchema = z.object({
      id: z.number(),
      title: z.string(),
      amount: z.number(),
    });

    const updatedExpense = updatedExpenseSchema.parse(await response.json());

    return {
      content: [
        {
          type: "text",
          text:
            "Successfully updated expense.\n" +
            `id: ${updatedExpense.id}\n` +
            `title: ${updatedExpense.title}\n` +
            `amount: ${updatedExpense.amount}`,
        },
      ],
    };
  },
);

server.registerTool(
  "delete_expense",
  {
    description: "Delete an expense by ID and return a success message.",
    inputSchema: {
      id: z.number().describe("The ID of the expense to delete."),
    },
  },
  async ({ id }) => {
    const response = await fetch(`http://localhost:8080/expenses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete expense ${id}: ${response.status}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted expense ${id}.`,
        },
      ],
    };
  },
);

server.registerTool(
  "create_expense",
  {
    description: "Create a new expense and return the created expense details.",
    inputSchema: {
      title: z.string().describe("The title of the expense."),
      amount: z.number().describe("The amount of the expense."),
    },
  },
  async ({ title, amount }) => {
    const response = await fetch("http://localhost:8080/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create expense: ${response.status}`);
    }

    const createdExpenseSchema = z.object({
      id: z.number(),
      title: z.string(),
      amount: z.number(),
    });

    const createdExpense = createdExpenseSchema.parse(await response.json());

    return {
      content: [
        {
          type: "text",
          text:
            "Successfully created expense.\n" +
            `id: ${createdExpense.id}\n` +
            `title: ${createdExpense.title}\n` +
            `amount: ${createdExpense.amount}`,
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
