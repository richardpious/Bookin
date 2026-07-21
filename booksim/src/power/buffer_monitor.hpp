#ifndef _BUFFER_MONITOR_HPP_
#define _BUFFER_MONITOR_HPP_

#include <vector>
#include <iostream>

using namespace std;

class Flit;

class BufferMonitor {
  int  _cycles ;
  int  _inputs ;
  int  _classes ;
  vector<int> _reads ;
  vector<int> _writes ;
  int index( int input, int cl ) const ;
public:
  BufferMonitor( int inputs, int classes ) ;
  void cycle() ;
  void write( int input, Flit const * f ) ;
  void read( int input, Flit const * f ) ;
  inline const vector<int> & GetReads() const {
    return _reads;
  }
  inline const vector<int> & GetWrites() const {
    return _writes;
  }
  inline int NumInputs() const {
    return _inputs;
  }
  inline int NumClasses() const {
    return _classes;
  }
  void display(ostream & os) const;

} ;

ostream & operator<<( ostream & os, BufferMonitor const & obj ) ;

#endif
