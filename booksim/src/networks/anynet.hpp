#ifndef _ANYNET_HPP_
#define _ANYNET_HPP_

#include "network.hpp"
#include "routefunc.hpp"
#include <cassert>
#include <string>
#include <map>
#include <list>

class AnyNet : public Network {

  string file_name;
  //associtation between  nodes and routers
  map<int, int > node_list;
  //[link type][src router][dest router]=(port, latency)
  vector<map<int,  map<int, pair<int,int> > > > router_list;
  //stores minimal routing information from every router to every node
  //[router][dest_node]=port
  vector<map<int, int> > routing_table;

  void _ComputeSize( const Configuration &config );
  void _BuildNet( const Configuration &config );
  void readFile();
  void buildRoutingTable();
  void route(int r_start);

public:
  AnyNet( const Configuration &config, const string & name );
  ~AnyNet();

  int GetN( ) const{ return -1;}
  int GetK( ) const{ return -1;}

  static void RegisterRoutingFunctions();
  double Capacity( ) const {return -1;}
  void InsertRandomFaults( const Configuration &config ){}
};

void min_anynet( const Router *r, const Flit *f, int in_channel, 
		      OutputSet *outputs, bool inject );
#endif
