#ifndef _VCD_TRACER_HPP_
#define _VCD_TRACER_HPP_

#include <fstream>
#include <map>
#include <string>
#include <vector>

class Configuration;
class Flit;

class VCDTracer {
public:
  VCDTracer(Configuration const & config, int nodes, int routers, int router_outputs, int vcs);
  ~VCDTracer();

  bool Enabled() const;
  bool ShouldTrace(Flit const * f) const;
  bool InTraceWindow(int cycle) const;
  bool LookupPacket(int packet_id, int * src, int * dest) const;

  void Cycle(int cycle);
  void TracePacketGenerated(int node, int packet_id, int src, int dest,
                            int flit_id_start, int flit_id_end);
  void TraceRouterOutput(int router, int output, Flit const * f);

  void TraceInject(int node, int subnet, Flit const * f);
  void TraceEject(int node, int subnet, Flit const * f);
  void TraceChannelBegin(std::string const & channel, int source_router,
                         int source_port, int sink_router, int sink_port,
                         int delay, Flit const * f);
  void TraceChannelEnd(std::string const & channel, int source_router,
                       int source_port, int sink_router, int sink_port,
                       Flit const * f);
  void TraceRouterInput(int router, int input, Flit const * f);
  void TraceVCOccupancy(int router, int input, int vc, int occupancy);
  void TraceCrossbarBegin(int router, int input, int output, Flit const * f);
  void TraceCrossbarEnd(int router, int input, int output, Flit const * f);

private:
  struct PacketGenSignals {
    std::string valid;
    std::string packet;
    std::string src;
    std::string dest;
    std::string flit_id_start;
    std::string flit_id_end;
  };

  struct LinkSignals {
    std::string valid;
    std::string flit;
    std::string packet;
    std::string vc;
    std::string src;
    std::string dest;
    std::string head;
    std::string tail;
  };

  bool _enabled;
  int _start_cycle;
  int _end_cycle;
  int _trace_flit;
  int _trace_packet;
  int _nodes;
  int _routers;
  int _router_outputs;
  int _vcs;
  std::ofstream _out;
  std::string _cycle_id;
  std::map<int, int> _packet_src;
  std::map<int, int> _packet_dest;
  int _next_id;
  long long _last_time;

  std::vector<PacketGenSignals> _node_gen;
  std::vector<LinkSignals> _node_link;
  std::vector<std::vector<LinkSignals> > _router_in;
  std::vector<std::vector<LinkSignals> > _router_link;
  std::vector<std::vector<std::vector<std::string> > > _router_vc_occupancy;
  std::vector<std::vector<std::vector<int> > > _router_vc_occupancy_last;

  std::string _AllocId();
  std::string _Register(std::string const & name, int width);
  std::string _RegisterInteger(std::string const & name, int width);
  void _WriteHeader();
  void _Time(long long time);
  void _Set(std::string const & id, unsigned long long value);
  void _SetBit(std::string const & id, bool value);
  void _Clear(PacketGenSignals const & sigs);
  void _Clear(LinkSignals const & sigs);
  void _Trace(PacketGenSignals const & sigs, int packet_id, int src, int dest,
              int flit_id_start, int flit_id_end);
  void _Trace(LinkSignals const & sigs, Flit const * f);
};

extern VCDTracer * gVCDTracer;

#endif
