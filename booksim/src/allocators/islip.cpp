#include "booksim.hpp"
#include <iostream>

#include "islip.hpp"
#include "random_utils.hpp"

//#define DEBUG_ISLIP

iSLIP_Sparse::iSLIP_Sparse( Module *parent, const string& name,
			    int inputs, int outputs, int iters ) :
  SparseAllocator( parent, name, inputs, outputs ),
  _iSLIP_iter(iters)
{
  _gptrs.resize(_outputs, 0);
  _aptrs.resize(_inputs, 0);
}

void iSLIP_Sparse::Allocate( )
{
  int input;
  int output;

  int input_offset;
  int output_offset;

  map<int, sRequest>::iterator p;
  bool wrapped;

  for ( int iter = 0; iter < _iSLIP_iter; ++iter ) {
    // Grant phase

    vector<int> grants(_outputs, -1);

    for ( output = 0; output < _outputs; ++output ) {

      // Skip loop if there are no requests
      // or the output is already matched
      if ( ( _out_req[output].empty( ) ) ||
	   ( _outmatch[output] != -1 ) ) {
	continue;
      }

      // A round-robin arbiter between input requests
      input_offset = _gptrs[output];

      p = _out_req[output].begin( );
      while( ( p != _out_req[output].end( ) ) &&
	     ( p->second.port < input_offset ) ) {
	p++;
      }

      wrapped = false;
      while( (!wrapped) || 
	     ( ( p != _out_req[output].end( ) ) &&
	       ( p->second.port < input_offset ) ) ) {
	if ( p == _out_req[output].end( ) ) {
	  if ( wrapped ) { break; }
	  // p is valid here because empty lists
	  // are skipped (above)
	  p = _out_req[output].begin( );
	  wrapped = true;
	}

	input = p->second.port;

	// we know the output is free (above) and
	// if the input is free, grant request
	if ( _inmatch[input] == -1 ) {
	  grants[output] = input;
	  break;
	}

	p++;
      }      
    }

#ifdef DEBUG_ISLIP
    cout << "grants: ";
    for ( int i = 0; i < _outputs; ++i ) {
      cout << grants[i] << " ";
    }
    cout << endl;

    cout << "aptrs: ";
    for ( int i = 0; i < _inputs; ++i ) {
      cout << _aptrs[i] << " ";
    }
    cout << endl;
#endif

    // Accept phase

    for ( input = 0; input < _inputs; ++input ) {

      if ( _in_req[input].empty( ) ) {
	continue;
      }

      // A round-robin arbiter between output grants
      output_offset = _aptrs[input];

      p = _in_req[input].begin( );
      while( ( p != _in_req[input].end( ) ) &&
	     ( p->second.port < output_offset ) ) {
	p++;
      }

      wrapped = false;
      while( (!wrapped) || 
	     ( ( p != _in_req[input].end( ) ) &&
	       ( p->second.port < output_offset ) ) ) {
	if ( p == _in_req[input].end( ) ) {
	  if ( wrapped ) { break; }
	  // p is valid here because empty lists
	  // are skipped (above)
	  p = _in_req[input].begin( );
	  wrapped = true;
	}

	output = p->second.port;

	// we know the output is free (above) and
	// if the input is free, grant request
	if ( grants[output] == input ) {
	  // Accept
	  _inmatch[input]   = output;
	  _outmatch[output] = input;

	  // Only update pointers if accepted during the 1st iteration
	  if ( iter == 0 ) {
	    _gptrs[output] = ( input + 1 ) % _inputs;
	    _aptrs[input]  = ( output + 1 ) % _outputs;
	  }

	  break;
	}

	p++;
      } 
    }
  }

#ifdef DEBUG_ISLIP
  cout << "input match: ";
  for ( int i = 0; i < _inputs; ++i ) {
    cout << _inmatch[i] << " ";
  }
  cout << endl;

  cout << "output match: ";
  for ( int j = 0; j < _outputs; ++j ) {
    cout << _outmatch[j] << " ";
  }
  cout << endl;
#endif
}
