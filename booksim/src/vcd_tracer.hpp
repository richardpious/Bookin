#ifndef _VCD_TRACER_HPP_
#define _VCD_TRACER_HPP_

#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#include <zlib.h>

class Configuration;
class Flit;

class VCDTracer {
public:
  // Pipeline result codes (3-bit encoding)
  static const int PIPE_NONE         = 0;
  static const int PIPE_SUCCESS      = 1;
  static const int PIPE_STALL_BUSY   = 2;
  static const int PIPE_STALL_CONFLICT = 3;
  static const int PIPE_STALL_FULL   = 4;
  static const int PIPE_STALL_RESERVED = 5;
  static const int PIPE_MISSPEC      = 6;

  // Pipeline stage indices
  static const int STAGE_BW = 0;  // Buffer Write
  static const int STAGE_RC = 1;  // Route Compute
  static const int STAGE_VA = 2;  // VC Alloc
  static const int STAGE_SA = 3;  // Switch Alloc
  static const int STAGE_ST = 4;  // Switch Traversal
  static const int NUM_STAGES = 5;

  VCDTracer(Configuration const & config, int nodes, int routers, int router_outputs, int vcs);
  ~VCDTracer();

  bool Enabled() const;
  bool ShouldTrace(Flit const * f) const;
  bool InTraceWindow(int cycle) const;
  bool LookupPacket(int packet_id, int * src, int * dest) const;
  inline bool ShouldTraceRouter(int router) const {
    return _trace_router < 0 || _trace_router == router;
  }

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

  // --- New granular tracing methods ---

  // Component 1: Per-VC state
  void TraceVCState(int router, int input, int vc, int state,
                    int front_flit_id, int front_packet_id,
                    int out_port, int out_vc);

  // Component 2: Pipeline stages
  void TracePipelineBW(int router, int input, int vc, Flit const * f);
  void TracePipelineRC(int router, int input, int vc, Flit const * f, bool complete);
  void TracePipelineVA(int router, int input, int vc, Flit const * f, int result, int out_port, int out_vc);
  void TracePipelineSA(int router, int input, int vc, Flit const * f, int result, int out_port);
  void TracePipelineST(int router, int input, int output, Flit const * f, bool begin);

  // Component 5: Downstream credits
  void TraceDownstreamCredits(int router, int output, int vc, int occupancy, int available, int limit);

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

  // Component 1: Per-VC signals
  struct VCSignals {
    std::string state;         // 2-bit
    std::string front_flit;    // 16-bit
    std::string front_packet;  // 16-bit
    std::string out_port;      // 8-bit
    std::string out_vc;        // 8-bit
  };

  // Component 2: Pipeline signals
  struct PipelineSignals {
    std::string valid;    // 1-bit
    std::string flit;     // 16-bit
    std::string packet;   // 16-bit
    std::string vc;       // 4-bit
    std::string output;   // 4-bit
    std::string out_vc;   // 4-bit
    std::string result;   // 3-bit
  };

  // Component 4: Inject/Eject signals
  struct InjectEjectSignals {
    std::string valid;    // 1-bit
    std::string flit;     // 16-bit
    std::string packet;   // 16-bit
    std::string vc;       // 4-bit
    std::string src;      // 8-bit
    std::string dest;     // 8-bit
  };

  // Component 4: Crossbar signals
  struct CrossbarSignals {
    std::string valid;    // 1-bit
    std::string flit;     // 16-bit
    std::string packet;   // 16-bit
    std::string input;    // 4-bit
    std::string output;   // 4-bit
    std::string vc;       // 4-bit
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

  // Config-controlled granularity (Component 6)
  bool _trace_vc;
  bool _trace_pipeline;
  bool _trace_credits;
  int  _trace_router;  // -1 = all

  // Gzip output (Component 7)
  bool _use_gzip;
  gzFile _gz_out;
  std::ofstream _out;

  std::string _cycle_id;
  std::map<int, int> _packet_src;
  std::map<int, int> _packet_dest;
  int _next_id;
  long long _last_time;

  // Existing port-level signals
  std::vector<PacketGenSignals> _node_gen;
  std::vector<LinkSignals> _node_link;
  std::vector<std::vector<LinkSignals> > _router_in;
  std::vector<std::vector<LinkSignals> > _router_link;
  std::vector<std::vector<std::vector<std::string> > > _router_vc_occupancy;
  std::vector<std::vector<std::vector<int> > > _router_vc_occupancy_last;

  // Component 1: VC-level signals
  std::vector<std::vector<std::vector<VCSignals> > > _router_vc_signals;
  std::vector<std::vector<std::vector<int> > > _router_vc_state_last;
  std::vector<std::vector<std::vector<int> > > _router_vc_front_flit_last;
  std::vector<std::vector<std::vector<int> > > _router_vc_out_port_last;
  std::vector<std::vector<std::vector<int> > > _router_vc_out_vc_last;

  // Component 2: Pipeline signals [router][stage][input]
  std::vector<std::vector<std::vector<PipelineSignals> > > _router_pipeline;

  // Component 4: Inject/Eject
  std::vector<InjectEjectSignals> _node_inject;
  std::vector<InjectEjectSignals> _node_eject;

  // Component 4: Crossbar [router][output]
  std::vector<std::vector<CrossbarSignals> > _router_crossbar;

  // Component 5: Downstream credits [router][output][vc]
  std::vector<std::vector<std::vector<std::string> > > _router_ds_occupancy;
  std::vector<std::vector<std::vector<std::string> > > _router_ds_available;
  std::vector<std::vector<std::vector<int> > > _router_ds_occupancy_last;
  std::vector<std::vector<std::vector<int> > > _router_ds_available_last;

  std::string _AllocId();
  std::string _Register(std::string const & name, int width);
  std::string _RegisterInteger(std::string const & name, int width);
  void _WriteHeader();
  void _Time(long long time);
  void _Set(std::string const & id, unsigned long long value);
  void _SetBit(std::string const & id, bool value);
  void _Clear(PacketGenSignals const & sigs);
  void _Clear(LinkSignals const & sigs);
  void _Clear(InjectEjectSignals const & sigs);
  void _Clear(CrossbarSignals const & sigs);
  void _Clear(PipelineSignals const & sigs);
  void _Trace(PacketGenSignals const & sigs, int packet_id, int src, int dest,
              int flit_id_start, int flit_id_end);
  void _Trace(LinkSignals const & sigs, Flit const * f);
  void _Trace(InjectEjectSignals const & sigs, Flit const * f);

  // Component 7: Gzip write wrapper
  void _Write(std::string const & s);
  void _Write(char c);
};

extern VCDTracer * gVCDTracer;

#endif
