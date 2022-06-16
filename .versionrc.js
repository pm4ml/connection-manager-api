/**
* References:
* https://github.com/conventional-changelog/conventional-changelog-config-spec
* https://github.com/conventional-changelog/standard-version#customizing-changelog-generation
**/

module.exports = {
    types: [
      {type: "feat", section: "Features", hidden: false},
      {type: "fix", section: "Bug Fixes", hidden: false},
      {type: "chore", section: "Chore", hidden: false},
      {type: "docs", section: "Documentation", hidden: false},
      {type: "style", section: "Style", hidden: false},
      {type: "refactor", section: "Refactor", hidden: false},
      {type: "perf", section: "Performance", hidden: false},
      {type: "test", section: "Test", hidden: false},
      {type: "ci", section: "Continuous Integration", hidden: true},
      {type: "build", section: "Build", hidden: true}
    ]
  }