const modules = {};

module.exports = async (name) => {
  if (!modules[name]) {
    modules[name] = await import(name);
  }
  return modules[name];
};

