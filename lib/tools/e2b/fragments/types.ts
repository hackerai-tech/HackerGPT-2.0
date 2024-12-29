import { z } from "zod"
import { fragmentSchema } from "./fragment-schema"
import templates from "./templates.json"
import { ExecutionError, Result } from "@e2b/code-interpreter"

type ExecutionResultBase = {
  sbxId: string
}

export type ExecutionResultInterpreter = ExecutionResultBase & {
  template: "code-interpreter-v1"
  stdout: string[]
  stderr: string[]
  runtimeError?: ExecutionError
  cellResults: Result[]
}

export type ExecutionResultWeb = ExecutionResultBase & {
  template: Exclude<TemplateId, "code-interpreter-v1">
  url: string
}

export type Fragment = {
  template: string
  title: string
  commentary: string
  additional_dependencies: string[]
  has_additional_dependencies: boolean
  install_dependencies_command: string
  port: number | null
  file_path: string
  code: string
  sandboxExecution?: "started" | "completed"
  sandboxResult?: ExecutionResultInterpreter | ExecutionResultWeb
}

export type Templates = typeof templates
export type TemplateId = keyof typeof templates
export type TemplateConfig = (typeof templates)[TemplateId]

export type ExecutionResult = ExecutionResultInterpreter | ExecutionResultWeb

export type FragmentSchema = z.infer<typeof fragmentSchema>
