// ----------------------------------------------------------------------
//
//  TreeArbiter
//
// ----------------------------------------------------------------------

#ifndef _TREE_ARB_HPP_
#define _TREE_ARB_HPP_

#include "arbiter.hpp"

class TreeArbiter : public Arbiter {

  int  _group_size ;

  vector<Arbiter *> _group_arbiters;
  Arbiter * _global_arbiter;

  vector<int> _group_reqs;

public:

  // Constructors
  TreeArbiter( Module *parent, const string &name, int size, int groups, const string & arb_type ) ;

  ~TreeArbiter();

  // Print priority matrix to standard output
  virtual void PrintState() const ;
  
  // Update priority matrix based on last aribtration result
  virtual void UpdateState() ; 

  // Arbitrate amongst requests. Returns winning input and 
  // updates pointers to metadata when valid pointers are passed
  virtual int Arbitrate( int* id = 0, int* pri = 0) ;

  virtual void AddRequest( int input, int id, int pri ) ;

  virtual void Clear();

} ;

#endif
