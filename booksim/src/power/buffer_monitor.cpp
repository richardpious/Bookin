#include "buffer_monitor.hpp"

#include "flit.hpp"

BufferMonitor::BufferMonitor( int inputs, int classes ) 
: _cycles(0), _inputs(inputs), _classes(classes) {
  _reads.resize(inputs * classes, 0) ;
  _writes.resize(inputs * classes, 0) ;
}

int BufferMonitor::index( int input, int cl ) const {
  assert((input >= 0) && (input < _inputs)); 
  assert((cl >= 0) && (cl < _classes));
  return cl + _classes * input ;
}

void BufferMonitor::cycle() {
  _cycles++ ;
}

void BufferMonitor::write( int input, Flit const * f ) {
  _writes[ index(input, f->cl) ]++ ;
}

void BufferMonitor::read( int input, Flit const * f ) {
  _reads[ index(input, f->cl) ]++ ;
}

void BufferMonitor::display(ostream & os) const {
  for ( int i = 0 ; i < _inputs ; i++ ) {
    os << "[ " << i << " ] " ;
    for ( int c = 0 ; c < _classes ; c++ ) {
      os << "Type=" << c
	 << ":(R#" << _reads[ index( i, c) ]  << ","
	 << "W#" << _writes[ index( i, c) ] << ")" << " " ;
    }
    os << endl ;
  }
}

ostream & operator<<( ostream & os, BufferMonitor const & obj ) {
  obj.display(os);
  return os ;
}
