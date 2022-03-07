import { Handler } from '@netlify/functions'
import { Client } from '@notionhq/client'
import fetch from 'node-fetch'

const authToken = process.env.NOTION_TOKEN
const waveAppsUserId = process.env.WAVE_APPS_USER_ID
const waveAppsEndpoint = process.env.WAVE_APPS_API_ENDPOINT
const waveAppsFullAccesToken = process.env.WAVE_APPS_FULL_ACCESS_TOKEN
const hourTrackerId = '847f71096748427f8d5844de8dc828dd'
const notion = new Client({ auth: authToken })

const monday = new Date()
monday.setDate(monday.getDate() + ((((7 - monday.getDay()) % 7) + 1) % 7))

const handler: Handler = async () => {
  // Fetch the past week's worth of entries
  const pagesResponse = await notion.databases.query({
    database_id: hourTrackerId,
    filter: {
      or: [
        {
          property: 'Date',
          date: {
            past_week: {}
          }
        }
      ]
    }
  })

  // Return full list of entries from bulleted_list_item fields
  const entriesArray = await Promise.all(
    pagesResponse.results.map(async result => {
      const { id } = result
      const { results } = await notion.blocks.children.list({
        block_id: id
      })

      const bulletPoints = results.map((result: any) => {
        const { bulleted_list_item } = result
        const points = bulleted_list_item?.text[0]?.plain_text

        return points
      })
      const scrubbedPoints = bulletPoints.filter(point => point != null)
      const bulletedListItems = scrubbedPoints.map(entry => {
        return {
          bulleted_list_item: {
            text: [
              {
                text: { content: entry }
              }
            ]
          }
        }
      })

      return bulletedListItems
    })
  )

  const pastWeeksEntries = entriesArray.flat()

  let data = await fetch(waveAppsEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waveAppsFullAccesToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        mutation CreateInvoice($businessId: ID!, $customerId: ID!) {
          invoiceCreate(
            input: { businessId: $businessId, customerId: $customerId }
          ) {
            invoice {
              id
            }
            didSucceed
            inputErrors {
              path
              message
            }
          }
        }
      `,
      variables: {
        businessId: '92e460fa-be94-4c6c-87b8-7aeed3cb0930',
        customerId: '62221045'
      }
    })
  }).then(res => res.json())

  return {
    statusCode: 200,
    body: JSON.stringify(data, null, 2)
  }
}

module.exports = { handler }
