#ifndef _MAXSIZE_HPP_
#define _MAXSIZE_HPP_

#include <vector>

#include "allocator.hpp"

class MaxSizeMatch : public DenseAllocator {
  vector<int> _from;   // array to hold breadth-first tree
  int *_s;      // stack of leaf nodes in tree
  int *_ns;     // next stack
  int _prio;    // priority pointer to ensure fairness
 
  bool _ShortestAugmenting( );

public:
  MaxSizeMatch( Module *parent, const string& name,
		int inputs, int ouputs ); 
  ~MaxSizeMatch( );
  
  void Allocate( );
};

#endif 
