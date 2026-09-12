import { readdirSync } from 'node:fs'

const OUTSIDE = ['src/app', 'src/components', 'src/lib']

export function featureNames(root = 'src/features') {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * Zones 2 and 3 are generated per feature, so a new slice inherits both with no
 * config edit. Zone 3's target list is empty while only one feature exists — it
 * becomes load-bearing at exactly the moment someone would have forgotten to
 * add it by hand.
 */
export function buildZones(features) {
  const perFeature = features.flatMap((feature) => {
    const self = `src/features/${feature}`
    const siblings = features
      .filter((other) => other !== feature)
      .map((other) => `src/features/${other}`)

    return [
      {
        zone: 2,
        target: [...OUTSIDE, ...siblings],
        from: self,
        except: ['index.ts'],
        message: `Zone 2: reach ${feature} only through src/features/${feature}/index.ts — the slice's whole public surface. Export it there rather than reaching past it.`,
      },
      ...(siblings.length > 0
        ? [
            {
              zone: 3,
              target: siblings,
              from: self,
              message: `Zone 3: no feature imports another, not even its index.ts. Move the shared thing up into src/lib/ (logic) or src/components/ (UI).`,
            },
          ]
        : []),
    ]
  })

  return [
    {
      zone: 1,
      target: 'src/components',
      from: 'src/features',
      message:
        'Zone 1: the design system may not know about features. Lift the type to src/lib/, or pass it in as a prop.',
    },
    ...perFeature,
    {
      zone: 4,
      target: 'src/lib',
      from: ['src/features', 'src/components'],
      message:
        'Zone 4: src/lib/ is a leaf and imports nothing from the app. A module earns a place there only if it is domain rather than product.',
    },
    ...features.map((feature) => ({
      zone: 6,
      target: `src/features/${feature}/lib`,
      from: [
        'src/components',
        `src/features/${feature}/components`,
        `src/features/${feature}/hooks`,
        `src/features/${feature}/state`,
      ],
      message:
        'Zone 6: no lib/ module imports UI, a hook or the store. Business logic does not depend on what renders it.',
    })),
  ]
}

/** ESLint wants { target, from, except, message } — `zone` is ours, for tests. */
export const asRule = (zones) =>
  zones.map((zone) => ({
    target: zone.target,
    from: zone.from,
    message: zone.message,
    ...(zone.except ? { except: zone.except } : {}),
  }))
