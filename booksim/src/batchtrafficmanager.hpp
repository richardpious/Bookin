#ifndef _BATCHTRAFFICMANAGER_HPP_
#define _BATCHTRAFFICMANAGER_HPP_

#include <iostream>

#include "config_utils.hpp"
#include "stats.hpp"
#include "trafficmanager.hpp"

class BatchTrafficManager : public TrafficManager {

protected:

  int _max_outstanding;
  int _batch_size;
  int _batch_count;
  int _last_id;
  int _last_pid;

  Stats * _batch_time;
  double _overall_min_batch_time;
  double _overall_avg_batch_time;
  double _overall_max_batch_time;

  ostream * _sent_packets_out;

  virtual void _RetireFlit( Flit *f, int dest );

  virtual int _IssuePacket( int source, int cl );
  virtual void _ClearStats( );
  virtual bool _SingleSim( );

  virtual void _UpdateOverallStats( );

  virtual string _OverallStatsCSV(int c = 0) const;

public:

  BatchTrafficManager( const Configuration &config, const vector<Network *> & net );
  virtual ~BatchTrafficManager( );

  virtual void WriteStats( ostream & os = cout ) const;
  virtual void DisplayStats( ostream & os = cout ) const;
  virtual void DisplayOverallStats( ostream & os = cout ) const;

};

#endif
