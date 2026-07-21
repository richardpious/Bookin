#include "switch_monitor.hpp"

#include "flit.hpp"

SwitchMonitor::SwitchMonitor( int inputs, int outputs, int classes )
: _cycles(0), _inputs(inputs), _outputs(outputs), _classes(classes) {
  _event.resize(inputs * outputs * classes, 0) ;
}

int SwitchMonitor::index( int input, int output, int cl ) const {
  assert((input >= 0) && (input < _inputs));
  assert((output >= 0) && (output < _outputs));
  assert((cl >= 0) && (cl < _classes));
  return cl + _classes * ( output + _outputs * input ) ;
}

void SwitchMonitor::cycle() {
  _cycles++ ;
}

void SwitchMonitor::traversal( int input, int output, Flit const * f ) {
  _event[ index( input, output, f->cl) ]++ ;
}

void SwitchMonitor::display(ostream & os) const {
  for ( int i = 0 ; i < _inputs ; i++ ) {
    for ( int o = 0 ; o < _outputs ; o++) {
      os << "[" << i << " -> " << o << "] " ;
      for ( int c = 0 ; c < _classes ; c++ ) {
	os << c << ":" << _event[index(i,o,c)] << " " ;
      }
      os << endl ;
    }
  }
}

ostream & operator<<( ostream & os, SwitchMonitor const & obj ) {
  obj.display(os);
  return os ;
}
