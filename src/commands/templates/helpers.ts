import { join, dirname } from 'path'
import { isEmpty } from 'lodash'
import { readJsonSync, readFileSync, existsSync } from 'fs-extra'
import traverse from 'traverse'
import dirTree from 'directory-tree'
import { TemplateManifest, MetaFileTraverse, MetaFile } from '../../types'

/**
 * Parses templates folder and files
 */

export const createManifest = (path: string): TemplateManifest[] => {
  let manifest: TemplateManifest[] = []

  // Return empty array if path does not exist
  if (!existsSync(path)) return manifest

  // Find meta files and flatten into collection
  const list: MetaFileTraverse[] = findMetaFiles(path)

  // Parse each directory
  list.forEach(file => {
    const item = createManifestItem(file)
    if (item) manifest.push(item)
  })

  return manifest
}

/**
 * Searches for all metadata files and flattens into a collection
 */
export const findMetaFiles = (path: string): MetaFileTraverse[] =>
  traverse(dirTree(path)).reduce((acc, file) => {
    if (file.name === 'meta.json') acc.push(file)
    return acc
  }, [])

/**
 * Gathers the template's content and metadata based on the metadata file location
 */
export const createManifestItem = (file: MetaFileTraverse): MetaFile | null => {
  const { path } = file // Path to meta file
  const rootPath = dirname(path) // Folder path
  const htmlPath = join(rootPath, 'content.html') // HTML path
  const textPath = join(rootPath, 'content.txt') // Text path

  // Check if meta file exists
  if (existsSync(path)) {
    const metaFile: MetaFile = readJsonSync(path)
    const htmlFile: string = existsSync(htmlPath)
      ? readFileSync(htmlPath, 'utf-8')
      : ''
    const textFile: string = existsSync(textPath)
      ? readFileSync(textPath, 'utf-8')
      : ''

    return {
      HtmlBody: htmlFile,
      TextBody: textFile,
      ...metaFile,
    }
  }

  return null
}

type TemplateDifference = 'html' | 'text' | 'subject' | 'name' | 'layout'
type TemplateDifferences = Set<TemplateDifference>

export function templatesDiff(t1: TemplateManifest, t2: TemplateManifest): TemplateDifferences {
  const result: TemplateDifferences = new Set<TemplateDifference>()

  if (!sameContent(t1.HtmlBody, t2.HtmlBody)) result.add('html')
  if (!sameContent(t1.TextBody, t2.TextBody)) result.add('text')
  if (t2.TemplateType === 'Standard' && !sameContent(t1.Subject, t2.Subject)) result.add('subject')
  if (!sameContent(t1.Name, t2.Name)) result.add('name')
  if (t2.TemplateType === 'Standard' && !sameContent(t1.LayoutTemplate, t2.LayoutTemplate)) result.add('layout')

  return result;
}

export function sameContent(str1: string | null | undefined, str2: string | null | undefined): boolean {
  if (isEmpty(str1) && isEmpty(str2)) {
    return true
  }

  if (isEmpty(str1) || isEmpty(str2)) {
    return false
  }

  return str1 === str2
}
