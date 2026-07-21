                                                                     
                                                                     
                                                                     
                                             
#ifndef _DragonFly_HPP_
#define _DragonFly_HPP_

#include "network.hpp"
#include "routefunc.hpp"

class DragonFlyNew : public Network {

  int _m;
  int _n;
  int _r;
  int _k;
  int _p, _a, _g;
  int _radix;
  int _net_size;
  int _stageout;
  int _numinput;
  int _stages;
  int _num_of_switch;
  int _grp_num_routers;
  int _grp_num_nodes;


  void _ComputeSize( const Configuration &config );
  void _BuildNet( const Configuration &config );


 
public:
  DragonFlyNew( const Configuration &config, const string & name );

  int GetN( ) const;
  int GetK( ) const;

  double Capacity( ) const;
  static void RegisterRoutingFunctions();
  void InsertRandomFaults( const Configuration &config );

};
int dragonfly_port(int rID, int source, int dest);

void ugal_dragonflynew( const Router *r, const Flit *f, int in_channel,
		       OutputSet *outputs, bool inject );
void min_dragonflynew( const Router *r, const Flit *f, int in_channel, 
		       OutputSet *outputs, bool inject );

#endif 
