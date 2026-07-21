#ifndef _SWITCH_MONITOR_HPP_
#define _SWITCH_MONITOR_HPP_

#include <vector>
#include <iostream>

using namespace std;

class Flit;

class SwitchMonitor {
  int  _cycles ;
  int  _inputs ;
  int  _outputs ;
  int  _classes ;
  vector<int> _event ;
  int index( int input, int output, int cl ) const ;
public:
  SwitchMonitor( int inputs, int outputs, int classes ) ;
  void cycle() ;
  vector<int> const & GetActivity() const {
    return _event;
  }
  inline int const & NumInputs() const {
    return _inputs;
  }
  inline int const & NumOutputs() const {
    return _outputs;
  }
  inline int const & NumClasses() const {
    return _classes;
  }
  void traversal( int input, int output, Flit const * f ) ;
  void display(ostream & os) const;
} ;

ostream & operator<<( ostream & os, SwitchMonitor const & obj ) ;

#endif
