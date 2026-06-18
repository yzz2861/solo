import type { Entity, Paragraph, Uncertainty, EntityType, UncertaintyType } from '@/types'
import { entityPatterns, uncertaintyPatterns } from '@/data/keywords'
import { generateId } from '@/utils/parser'

export function extractEntities(paragraph: Paragraph): Entity[] {
  const entities: Entity[] = []
  const entityMap = new Map<string, Entity>()

  entityPatterns.forEach(({ type, patterns }) => {
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.source, 'g')
      let match: RegExpExecArray | null

      while ((match = regex.exec(paragraph.content)) !== null) {
        const name = match[0].trim()
        if (name.length < 2) continue

        const key = `${type}_${name}`
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            id: generateId(),
            type,
            name,
            confirmed: false,
            paragraphIds: [paragraph.id]
          })
        } else {
          const existing = entityMap.get(key)!
          if (!existing.paragraphIds.includes(paragraph.id)) {
            existing.paragraphIds.push(paragraph.id)
          }
        }
      }
    })
  })

  entities.push(...entityMap.values())
  return entities
}

export function extractAllEntities(paragraphs: Paragraph[]): {
  paragraphs: Paragraph[]
  entities: Entity[]
} {
  const allEntities: Entity[] = []
  const globalEntityMap = new Map<string, Entity>()

  const updatedParagraphs = paragraphs.map(paragraph => {
    const paragraphEntities = extractEntities(paragraph)

    paragraphEntities.forEach(entity => {
      const key = `${entity.type}_${entity.name}`
      if (!globalEntityMap.has(key)) {
        globalEntityMap.set(key, { ...entity })
      } else {
        const existing = globalEntityMap.get(key)!
        if (!existing.paragraphIds.includes(paragraph.id)) {
          existing.paragraphIds.push(paragraph.id)
        }
      }
    })

    return {
      ...paragraph,
      entities: paragraphEntities
    }
  })

  allEntities.push(...globalEntityMap.values())

  return {
    paragraphs: updatedParagraphs,
    entities: allEntities
  }
}

export function detectUncertainties(paragraph: Paragraph): Uncertainty[] {
  const uncertainties: Uncertainty[] = []

  uncertaintyPatterns.forEach(({ type, patterns }) => {
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.source, 'g')
      let match: RegExpExecArray | null

      while ((match = regex.exec(paragraph.content)) !== null) {
        const text = match[0].trim()
        if (text.length < 1) continue

        uncertainties.push({
          id: generateId(),
          type: type as UncertaintyType,
          status: 'pending',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          text,
          paragraphId: paragraph.id
        })
      }
    })
  })

  return uncertainties.sort((a, b) => a.startIndex - b.startIndex)
}

export function detectAllUncertainties(paragraphs: Paragraph[]): {
  paragraphs: Paragraph[]
  uncertainties: Uncertainty[]
} {
  const allUncertainties: Uncertainty[] = []

  const updatedParagraphs = paragraphs.map(paragraph => {
    const paragraphUncertainties = detectUncertainties(paragraph)
    allUncertainties.push(...paragraphUncertainties)

    return {
      ...paragraph,
      uncertainties: paragraphUncertainties
    }
  })

  return {
    paragraphs: updatedParagraphs,
    uncertainties: allUncertainties
  }
}

export function mergeDuplicatePersons(entities: Entity[]): Entity[] {
  const personEntities = entities.filter(e => e.type === 'person')
  const otherEntities = entities.filter(e => e.type !== 'person')

  const mergedMap = new Map<string, Entity>()

  personEntities.forEach(entity => {
    const normalizedName = entity.name
      .replace(/[先生|女士|师傅|师父|老师|大师|传承人]/g, '')
      .trim()

    const existingKey = Array.from(mergedMap.keys()).find(key => {
      const existingNormalized = key.replace(/[先生|女士|师傅|师父|老师|大师|传承人]/g, '').trim()
      return existingNormalized === normalizedName ||
        normalizedName.includes(existingNormalized) ||
        existingNormalized.includes(normalizedName)
    })

    if (existingKey) {
      const existing = mergedMap.get(existingKey)!
      entity.paragraphIds.forEach(pid => {
        if (!existing.paragraphIds.includes(pid)) {
          existing.paragraphIds.push(pid)
        }
      })
    } else {
      mergedMap.set(entity.name, { ...entity })
    }
  })

  return [...mergedMap.values(), ...otherEntities]
}

export function addEntity(
  paragraph: Paragraph,
  type: EntityType,
  name: string,
  startIndex: number,
  endIndex: number
): Entity {
  return {
    id: generateId(),
    type,
    name,
    confirmed: false,
    paragraphIds: [paragraph.id],
    metadata: {
      startIndex: startIndex.toString(),
      endIndex: endIndex.toString()
    }
  }
}
