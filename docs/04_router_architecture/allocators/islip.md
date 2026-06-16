# iSLIP Allocator

[<- Back to Allocators](README.md)

## Description
An iterative, round-robin matching algorithm. It uses independent arbiters for inputs and outputs. Grant pointers are only updated when an accept occurs, preventing starvation and ensuring fairness.
