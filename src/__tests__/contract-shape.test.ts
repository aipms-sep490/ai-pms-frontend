import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import assignmentExample from '../__contracts__/evaluation-assignments/get-assignment-detail-200.json'
import assignmentTypes from '../features/evaluations/evaluation-types.ts?raw'
import assignmentApi from '../services/api/evaluations.api.ts?raw'

function interfaceKeys(source: string, name: string): string[] {
  const file = ts.createSourceFile('contract.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declaration = file.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === name)
  if (!declaration || !ts.isInterfaceDeclaration(declaration)) throw new Error(`Interface ${name} missing`)
  return declaration.members.filter(ts.isPropertySignature).map(member => member.name?.getText(file).replaceAll(/["']/g, '') ?? '')
}

describe('contract-shape: BE vendored examples against FE interfaces', () => {
  it('requires every assignment detail key from the BE example', () => {
    const body = assignmentExample.response.body
    expect(Object.keys(body).filter(key => !interfaceKeys(assignmentApi, 'EvaluationAssignmentDetail').includes(key))).toEqual([])
    expect(Object.keys(body.assignment).filter(key => !interfaceKeys(assignmentTypes, 'EvaluationAssignment').includes(key))).toEqual([])
  })

  it.skip('requires every rubric key once BE-06/07 deliver a rubric-with-levels example', () => {
    // BE origin/develop currently has no rubric JSON example. This becomes active with BE Contract Card.
  })
})
