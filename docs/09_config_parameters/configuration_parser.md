[<- Config Parameters Index](README.md)

# Configuration Parser

BookSim uses a custom lex/yacc-based configuration parser to read the simulation parameters from the text files provided at runtime. The mechanics of this are defined in `config.l` (Lexer), `config.y` (Parser), and `config_utils.cpp`.

---

## 1. The Parsing Pipeline

When you run BookSim (`./booksim myconfig.txt`), the following sequence occurs:

1. **Instantiation**: A `Configuration` object (or specifically, a `BookSimConfig` object) is instantiated.
2. **Parsing**: The `ParseFile(string const & filename)` method is called.
3. **Lexical Analysis (Lex)**: The `config.l` flex file defines the tokens. It scans `myconfig.txt` and identifies variable names, integers, floats, strings, and assignment operators (`=`).
4. **Syntax Analysis (Yacc)**: The `config.y` bison file defines the grammar. It ensures that the tokens form valid assignments, such as `STR_ID '=' STR_VAL ';'`.
5. **Storage**: As valid assignments are parsed, the `Configuration::Assign()` method is called to store the key-value pairs in internal C++ `map` data structures.

## 2. Supported Data Types

The parser recognizes three primary data types:
- **Integer**: `int` (e.g., `num_vcs = 16`)
- **Floating Point**: `double` (e.g., `injection_rate = 0.1`)
- **String**: `string` (e.g., `topology = mesh`)

*Note*: Boolean values are typically represented as integers (`1` for true, `0` for false).

## 3. The `Configuration` Base Class (`config_utils.cpp`)

The `Configuration` class provides the foundational interface for retrieving parsed values anywhere in the codebase.

### 3.1 Retrieval Methods
- `GetInt(string const & field)`
- `GetFloat(string const & field)`
- `GetStr(string const & field)`
- `GetIntArray(string const & field)`
- `GetFloatArray(string const & field)`

### 3.2 Error Handling
If a module attempts to retrieve a parameter that does not exist in the parsed map, the `Configuration` class throws a fatal runtime error to prevent undefined behavior. This guarantees that all required parameters must either be explicitly defined in the config file or have a predefined default value.
