// GENERATED FROM tools/policy-definitions.ts — DO NOT EDIT
// Run 'pnpm policy:gen' to regenerate.

module.exports = {
  overrides: [
  {
    'files': [
      'apps/**/*'
    ],
    'rules': {
      'no-restricted-imports': [
        'error',
        {
          'patterns': [
            {
              'group': '@repo/database',
              'message': 'apps/* must not import packages/database directly; use packages/supabase client'
            },
            {
              'group': '@repo/database/*',
              'message': 'apps/* must not import packages/database directly; use packages/supabase client'
            }
          ]
        }
      ]
    }
  },
  {
    'files': [
      'packages/ui/**/*'
    ],
    'rules': {
      'no-restricted-imports': [
        'error',
        {
          'patterns': [
            {
              'group': '@repo/database',
              'message': 'UI components must be pure; no data layer access'
            },
            {
              'group': '@repo/database/*',
              'message': 'UI components must be pure; no data layer access'
            },
            {
              'group': '@repo/database',
              'message': 'UI must not reach database internals'
            },
            {
              'group': '@repo/database/*',
              'message': 'UI must not reach database internals'
            },
            {
              'group': '@repo/supabase',
              'message': 'UI is presentational; data fetching belongs in features/'
            },
            {
              'group': '@repo/supabase/*',
              'message': 'UI is presentational; data fetching belongs in features/'
            }
          ]
        }
      ]
    }
  },
  {
    'files': [
      'packages/theme/**/*'
    ],
    'rules': {
      'no-restricted-imports': [
        'error',
        {
          'patterns': [
            {
              'group': '@repo/ui',
              'message': 'Theme must not depend on UI; theme is consumed by UI'
            },
            {
              'group': '@repo/ui/*',
              'message': 'Theme must not depend on UI; theme is consumed by UI'
            }
          ]
        }
      ]
    }
  },
  {
    'files': [
      'tools/**/*'
    ],
    'rules': {
      'no-restricted-imports': [
        'error',
        {
          'patterns': [
            {
              'group': 'apps/*',
              'message': 'tools/* are build-time scripts; cannot import apps/* at runtime'
            },
            {
              'group': '@repo/supabase',
              'message': 'tools/* must not import runtime server/client code'
            },
            {
              'group': '@repo/supabase/*',
              'message': 'tools/* must not import runtime server/client code'
            }
          ]
        }
      ]
    }
  },
  {
    'files': [
      'packages/**/*'
    ],
    'rules': {
      'no-restricted-imports': [
        'error',
        {
          'patterns': [
            {
              'group': 'apps/*',
              'message': 'packages/* must not depend on apps/* (inversion of dependency)'
            }
          ]
        }
      ]
    }
  }
]
};
