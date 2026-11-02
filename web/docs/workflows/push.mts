// Writes subodh-public-school.json into the Subodh flow's agent workflow in Neon,
// as the dashboard's own save does. Usage: npx tsx push.mts <flow api key>
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const key = process.argv[2]
if (!key) throw new Error('Pass the flow key.')
const workflow = JSON.parse(fs.readFileSync(new URL('./subodh-public-school.json', import.meta.url), 'utf8'))
const db = new PrismaClient()
const flow = await db.flow.findUnique({ where: { apiKey: key }, select: { agentId: true, flowName: true } })
if (!flow) throw new Error('No flow with that key.')
await db.agent.update({ where: { id: flow.agentId }, data: { workflow } })
console.log(`Pushed to ${flow.flowName}: model ${workflow.nodes.llm.parameters.model}, prompt ${workflow.nodes.llm.parameters.system_prompt.length} chars`)
await db.$disconnect()
