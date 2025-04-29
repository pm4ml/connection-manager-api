module.exports = [
  {
    rules: {
      "comma-dangle": [
        "error",
        {
          arrays: "never",
          objects: "ignore",
          imports: "never",
          exports: "never",
          functions: "never"
        }
      ],
      "indent": ["error", 2],
      "no-extra-semi": "off",
      semi: ["error", "always"]
    }
  }
];
