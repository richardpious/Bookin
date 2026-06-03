[<- Config Parameters Index](README.md)

# The `BookSimConfig` Class

The `BookSimConfig` class (implemented in [booksim_config.cpp](../../booksim/src/booksim_config.cpp)) inherits from the base `Configuration` parser. Its primary role is to act as the centralized registry for all valid BookSim parameters, establishing their data types and default values.

---

## 1. Parameter Registration and Defaults

Before a configuration file is even parsed, the `BookSimConfig` constructor pre-populates the internal maps with every parameter BookSim recognizes, along with a default value.

```cpp
BookSimConfig::BookSimConfig() {
  // Network and Topology
  _int_map["k"] = 8;
  _int_map["n"] = 2;
  _str_map["topology"] = "torus";

  // Router Architecture
  _str_map["router"] = "iq";
  _int_map["routing_delay"] = 1;

  // Traffic
  _float_map["injection_rate"] = 0.1;
  _str_map["traffic"] = "uniform";
  
  // ... (hundreds of parameters)
}
```

### 1.1 Strict Typing
Because the maps (`_int_map`, `_float_map`, `_str_map`) are strictly typed in C++, a parameter can only hold the type it was registered with. If the user specifies `k = 8.5` in the config file, the parser will cast it to an integer or throw an error, depending on the lexer rules.

### 1.2 Backwards Compatibility
Providing defaults for every parameter ensures that old configuration files continue to work even as new features (and new parameters) are added to the simulator.

## 2. Overriding Parameters

BookSim evaluates parameter assignments in the following strict hierarchy (lowest to highest priority):

1. **Hardcoded Defaults**: Established in the `BookSimConfig` constructor.
2. **Configuration File**: Values specified in `myconfig.txt`.
3. **Command Line Arguments**: BookSim allows overriding any parameter directly from the shell when launching the executable.

### 2.1 Command-Line Overrides
You can override parameters by passing them as space-separated arguments after the configuration file.

```bash
./booksim myconfig.txt injection_rate=0.2 num_vcs=8
```
The `ParseArgs()` method handles this by bypassing the file lexer and directly calling `Assign()`. This is highly useful for scripting large parameter sweeps (e.g., generating latency-throughput curves) without needing to generate hundreds of distinct `.txt` configuration files.
