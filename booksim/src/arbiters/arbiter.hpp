// ----------------------------------------------------------------------
//
//  Arbiter: Base class for Matrix and Round Robin Arbiter
//
// ----------------------------------------------------------------------

#ifndef _ARBITER_HPP_
#define _ARBITER_HPP_

#include <vector>

#include "module.hpp"

class Arbiter : public Module {

protected:

  typedef struct { 
    bool valid ;
    int id ;
    int pri ;
  } entry_t ;
  
  vector<entry_t> _request ;
  int  _size ;

  int  _selected ;
  int _highest_pri;
  int _best_input;

public:
  int  _num_reqs ;
  // Constructors
  Arbiter( Module *parent, const string &name, int size ) ;
  
  // Print priority matrix to standard output
  virtual void PrintState() const = 0 ;
  
  // Register request with arbiter
  virtual void AddRequest( int input, int id, int pri ) ;

  // Update priority matrix based on last aribtration result
  virtual void UpdateState() = 0 ; 

  // Arbitrate amongst requests. Returns winning input and 
  // updates pointers to metadata when valid pointers are passed
  virtual int Arbitrate( int* id = 0, int* pri = 0 ) ;

  virtual void Clear();

  inline int LastWinner() const {
    return _selected;
  }

  static Arbiter *NewArbiter( Module *parent, const string &name,
			      const string &arb_type, int size );
} ;

#endif
