import { Handler, schedule } from "@netlify/functions";
import { Client } from "@notionhq/client";

const authToken = process.env.NOTION_TOKEN;
const hourTrackerId = "847f71096748427f8d5844de8dc828dd";
const oneOnOneId = "43268142d5e04ac090aa86f14c1cba1d";
const notion = new Client({ auth: authToken });

const monday = new Date();
monday.setDate(monday.getDate() + ((((7 - monday.getDay()) % 7) + 1) % 7));

const handler: Handler = async () => {
  // Fetch the past week's worth of entries
  const pagesResponse = await notion.databases.query({
    database_id: hourTrackerId,
    filter: {
      or: [
        {
          property: "Date",
          date: {
            past_week: {},
          },
        },
      ],
    },
  });

  // Return full list of entries from bulleted_list_item fields
  const entriesArray = await Promise.all(
    pagesResponse.results.map(async (result) => {
      const { id } = result;
      const { results } = await notion.blocks.children.list({
        block_id: id,
      });

      const bulletPoints = results.map((result: any) => {
        const { bulleted_list_item } = result;
        const points = bulleted_list_item?.text[0]?.plain_text;

        return points;
      });
      const scrubbedPoints = bulletPoints.filter((point) => point != null);
      const bulletedListItems = scrubbedPoints.map((entry) => {
        return {
          bulleted_list_item: {
            text: [
              {
                text: { content: entry },
              },
            ],
          },
        };
      });

      return bulletedListItems;
    })
  );

  const pastWeeksEntries = entriesArray.flat();

  // Create new page in ROC 1:1s
  notion.pages.create({
    parent: {
      database_id: oneOnOneId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: monday.toLocaleDateString("en-GB"),
            },
          },
        ],
      },
    },
    children: [
      {
        type: "heading_2",
        heading_2: {
          text: [
            {
              text: {
                content: "Last Week",
              },
            },
          ],
        },
      },
      ...pastWeeksEntries,
      {
        type: "heading_2",
        heading_2: {
          text: [
            {
              text: {
                content: "This Week",
              },
            },
          ],
        },
      },
      {
        bulleted_list_item: {
          text: [
            {
              text: {
                content: " ",
              },
            },
          ],
        },
      },
    ],
  });

  return {
    statusCode: 200,
    body: JSON.stringify(pastWeeksEntries, null, 2),
  };
};

module.exports.handler = schedule("0 17 * * SUN", handler);
