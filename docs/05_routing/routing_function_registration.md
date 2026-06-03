[<- Routing Index](README.md)

# Routing Function Registration

BookSim uses a flexible registration system to map the string parameter provided in the configuration file (`routing_function`) to the actual C++ function pointer that implements the algorithm.

---

## 1. The Global Map

All routing functions are registered in a global standard map defined in `routefunc.cpp`:

```cpp
map<string, tRoutingFunction> gRoutingFunctionMap;
```

Where `tRoutingFunction` is a typedef for the standard routing function signature:
```cpp
typedef void (*tRoutingFunction)( const Router *, const Flit *, int in_channel, OutputSet *, bool inject );
```

## 2. Registration Format

To assign a routing function to a topology, the topology class calls a registration function during initialization. 

The standard naming convention for the string key is:
`<routing_algorithm>_<topology_name>`

For example:
- `dim_order_mesh`
- `min_adapt_torus`
- `nca_fattree`

## 3. How to Add a Custom Routing Function

If you write a custom routing function, you must register it so the configuration parser can find it.

1. **Write the Function**: Implement your logic in `routefunc.cpp` following the `tRoutingFunction` signature.
   ```cpp
   void my_custom_routing(const Router *r, const Flit *f, int in_channel, OutputSet *outputs, bool inject) {
       int out_port = ... // Your logic here
       outputs->Clear();
       outputs->AddRange(out_port, vcBegin, vcEnd);
   }
   ```
2. **Register the Function**: Locate the `RegisterRoutingFunctions()` method for your target topology (e.g., inside `mesh.cpp` or a global initialization block) and add the mapping:
   ```cpp
   gRoutingFunctionMap["my_custom_mesh"] = &my_custom_routing;
   ```
3. **Use it in Config**:
   ```text
   topology = mesh
   routing_function = my_custom_mesh
   ```
