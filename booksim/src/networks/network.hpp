#ifndef _NETWORK_HPP_
#define _NETWORK_HPP_

#include <vector>
#include <deque>

#include "module.hpp"
#include "flit.hpp"
#include "credit.hpp"
#include "router.hpp"
#include "module.hpp"
#include "timed_module.hpp"
#include "flitchannel.hpp"
#include "channel.hpp"
#include "config_utils.hpp"
#include "globals.hpp"

typedef Channel<Credit> CreditChannel;


class Network : public TimedModule {
protected:

  int _size;
  int _nodes;
  int _channels;
  int _classes;

  vector<Router *> _routers;

  vector<FlitChannel *> _inject;
  vector<CreditChannel *> _inject_cred;

  vector<FlitChannel *> _eject;
  vector<CreditChannel *> _eject_cred;

  vector<FlitChannel *> _chan;
  vector<CreditChannel *> _chan_cred;

  deque<TimedModule *> _timed_modules;

  virtual void _ComputeSize( const Configuration &config ) = 0;
  virtual void _BuildNet( const Configuration &config ) = 0;

  void _Alloc( );

public:
  Network( const Configuration &config, const string & name );
  virtual ~Network( );

  static Network *New( const Configuration &config, const string & name );

  virtual void WriteFlit( Flit *f, int source );
  virtual Flit *ReadFlit( int dest );

  virtual void    WriteCredit( Credit *c, int dest );
  virtual Credit *ReadCredit( int source );

  inline int NumNodes( ) const {return _nodes;}

  virtual void InsertRandomFaults( const Configuration &config );
  void OutChannelFault( int r, int c, bool fault = true );

  virtual double Capacity( ) const;

  virtual void ReadInputs( );
  virtual void Evaluate( );
  virtual void WriteOutputs( );

  void Display( ostream & os = cout ) const;
  void DumpChannelMap( ostream & os = cout, string const & prefix = "" ) const;
  void DumpNodeMap( ostream & os = cout, string const & prefix = "" ) const;

  int NumChannels() const {return _channels;}
  const vector<FlitChannel *> & GetInject() {return _inject;}
  FlitChannel * GetInject(int index) {return _inject[index];}
  const vector<CreditChannel *> & GetInjectCred() {return _inject_cred;}
  CreditChannel * GetInjectCred(int index) {return _inject_cred[index];}
  const vector<FlitChannel *> & GetEject(){return _eject;}
  FlitChannel * GetEject(int index) {return _eject[index];}
  const vector<CreditChannel *> & GetEjectCred(){return _eject_cred;}
  CreditChannel * GetEjectCred(int index) {return _eject_cred[index];}
  const vector<FlitChannel *> & GetChannels(){return _chan;}
  const vector<CreditChannel *> & GetChannelsCred(){return _chan_cred;}
  const vector<Router *> & GetRouters(){return _routers;}
  Router * GetRouter(int index) {return _routers[index];}
  int NumRouters() const {return _size;}
};

#endif 

