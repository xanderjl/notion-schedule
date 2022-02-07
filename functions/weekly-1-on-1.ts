import { Handler } from "@netlify/functions";
import { Client } from "@notionhq/client";

const authToken = process.env.NOTION_TOKEN;
const databaseId = "847f71096748427f8d5844de8dc828dd";
const notion = new Client({ auth: authToken });

const handler: Handler = async (event, context) => {
  let targetDate = new Date();
  const weekAgo = targetDate.getDate() - 7;
  targetDate.setDate(weekAgo);

  const stuff = await notion.databases.query({
    database_id: databaseId,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(stuff, null, 2),
  };
};

export { handler };
