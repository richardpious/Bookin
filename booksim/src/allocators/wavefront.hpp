#ifndef _WAVEFRONT_HPP_
#define _WAVEFRONT_HPP_

#include <set>

#include "allocator.hpp"

class Wavefront : public DenseAllocator {

private:
  int _last_in;
  int _last_out;
  set<pair<int, int> > _priorities;
  bool _skip_diags;

protected:
  int _square;
  int _pri;
  int _num_requests;

public:
  Wavefront( Module *parent, const string& name,
	     int inputs, int outputs, bool skip_diags = false );
  
  virtual void AddRequest( int in, int out, int label = 1, 
			   int in_pri = 0, int out_pri = 0 );
  virtual void Allocate( );
};

#endif
