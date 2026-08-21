#include "vcd_tracer.hpp"

#include <algorithm>
#include <cassert>
#include <cstring>
#include <ctime>
#include <sstream>

#include "booksim_config.hpp"
#include "flit.hpp"
#include "globals.hpp"

VCDTracer * gVCDTracer = 0;

VCDTracer::VCDTracer(Configuration const & config, int nodes, int routers, int router_outputs, int vcs)
  : _enabled(config.GetInt("vcd_trace") > 0),
    _start_cycle(config.GetInt("vcd_trace_start")),
    _end_cycle(config.GetInt("vcd_trace_end")),
    _trace_flit(config.GetInt("vcd_trace_flit")),
    _trace_packet(config.GetInt("vcd_trace_packet")),
    _nodes(nodes),
    _routers(routers),
    _router_outputs(router_outputs),
    _vcs(vcs),
    _trace_vc(config.GetInt("vcd_trace_vc") > 0),
    _trace_pipeline(config.GetInt("vcd_trace_pipeline") > 0),
    _trace_credits(config.GetInt("vcd_trace_credits") > 0),
    _trace_router(config.GetInt("vcd_trace_router")),
    _use_gzip(false),
    _gz_out(NULL),
    _next_id(0),
    _last_time(-1) {
  if(!_enabled) {
    return;
  }

  std::string file = config.GetStr("vcd_trace_file");
  if(file.empty()) {
    file = "booksim.vcd.gz";
  }

  // Detect gzip mode from filename
  size_t len = file.size();
  _use_gzip = (len >= 3 && file.substr(len - 3) == ".gz");

  if(_use_gzip) {
    _gz_out = gzopen(file.c_str(), "wb6");
    if(!_gz_out) {
      _enabled = false;
      return;
    }
  } else {
    _out.open(file.c_str());
    if(!_out) {
      _enabled = false;
      return;
    }
  }
  _WriteHeader();
}

VCDTracer::~VCDTracer() {
  if(_use_gzip && _gz_out) {
    gzclose(_gz_out);
    _gz_out = NULL;
  }
  if(_out.is_open()) {
    _out.close();
  }
}

// ---- Write wrappers for gzip/plain output (Component 7) ----

void VCDTracer::_Write(std::string const & s) {
  if(_use_gzip) {
    gzwrite(_gz_out, s.c_str(), s.size());
  } else {
    _out << s;
  }
}

void VCDTracer::_Write(char c) {
  if(_use_gzip) {
    gzwrite(_gz_out, &c, 1);
  } else {
    _out << c;
  }
}

// ---- Query methods ----

bool VCDTracer::Enabled() const {
  return _enabled;
}

bool VCDTracer::InTraceWindow(int cycle) const {
  return _enabled && (cycle >= _start_cycle) && ((_end_cycle < 0) || (cycle <= _end_cycle));
}

bool VCDTracer::ShouldTrace(Flit const * f) const {
  if(!f) {
    return false;
  }
  if(_trace_flit >= 0 && f->id != _trace_flit) {
    return false;
  }
  if(_trace_packet >= 0 && f->pid != _trace_packet) {
    return false;
  }
  return true;
}

bool VCDTracer::LookupPacket(int packet_id, int * src, int * dest) const {
  std::map<int, int>::const_iterator src_iter = _packet_src.find(packet_id);
  std::map<int, int>::const_iterator dest_iter = _packet_dest.find(packet_id);
  if(src_iter == _packet_src.end() || dest_iter == _packet_dest.end()) {
    return false;
  }
  if(src) {
    *src = src_iter->second;
  }
  if(dest) {
    *dest = dest_iter->second;
  }
  return true;
}

// ---- Cycle start: clear per-cycle signals ----

void VCDTracer::Cycle(int cycle) {
  if(!InTraceWindow(cycle)) {
    return;
  }
  _Time(cycle);
  _Set(_cycle_id, cycle);

  for(int node = 0; node < _nodes; ++node) {
    _Clear(_node_gen[node], _node_gen_valid_last[node]);
    _Clear(_node_link[node], _node_link_valid_last[node]);
    _Clear(_node_inject[node], _node_inject_valid_last[node]);
    _Clear(_node_eject[node], _node_eject_valid_last[node]);
  }
  for(int router = 0; router < _routers; ++router) {
    if(!ShouldTraceRouter(router)) continue;
    for(int port = 0; port < _router_outputs; ++port) {
      _Clear(_router_in[router][port], _router_in_valid_last[router][port]);
      _Clear(_router_link[router][port], _router_link_valid_last[router][port]);
    }
    // Clear crossbar signals
    for(int port = 0; port < _router_outputs; ++port) {
      if(!_router_crossbar.empty() && !_router_crossbar[router].empty()) {
        _Clear(_router_crossbar[router][port], _router_crossbar_valid_last[router][port]);
      }
    }
    // Clear pipeline signals
    if(_trace_pipeline && !_router_pipeline.empty()) {
      for(int stage = 0; stage < NUM_STAGES; ++stage) {
        for(int inp = 0; inp < _router_outputs; ++inp) {
          _Clear(_router_pipeline[router][stage][inp], _router_pipeline_valid_last[router][stage][inp]);
        }
      }
    }
  }
}

// ---- Existing trace methods ----

void VCDTracer::TracePacketGenerated(int node, int packet_id, int src, int dest,
                                     int flit_id_start, int flit_id_end) {
  _packet_src[packet_id] = src;
  _packet_dest[packet_id] = dest;
  if(!InTraceWindow(GetSimTime()) || node < 0 || node >= _nodes) {
    return;
  }
  if(_trace_packet >= 0 && packet_id != _trace_packet) {
    return;
  }
  if(_trace_flit >= 0 && (_trace_flit < flit_id_start || _trace_flit > flit_id_end)) {
    return;
  }
  _Trace(_node_gen[node], _node_gen_valid_last[node], packet_id, src, dest, flit_id_start, flit_id_end);
}

void VCDTracer::TraceRouterOutput(int router, int output, Flit const * f) {
}

// ---- Inject / Eject (Component 4) ----

void VCDTracer::TraceInject(int node, int subnet, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || node < 0 || node >= _nodes || !ShouldTrace(f)) {
    return;
  }
  _Trace(_node_inject[node], _node_inject_valid_last[node], f);
}

void VCDTracer::TraceEject(int node, int subnet, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || node < 0 || node >= _nodes || !ShouldTrace(f)) {
    return;
  }
  _Trace(_node_eject[node], _node_eject_valid_last[node], f);
}

// ---- Channel tracing (existing) ----

void VCDTracer::TraceChannelBegin(std::string const &, int source_router, int source_port, int sink_router, int, int, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || sink_router < 0 || !ShouldTrace(f)) {
    return;
  }
  if(source_router < 0) {
    int node = f->src;
    if(node < 0 || node >= _nodes) {
      return;
    }
    _Trace(_node_link[node], _node_link_valid_last[node], f);
    return;
  }
  if(source_router >= _routers || source_port < 0 || source_port >= _router_outputs) {
    return;
  }
  if(!ShouldTraceRouter(source_router)) return;
  _Trace(_router_link[source_router][source_port], _router_link_valid_last[source_router][source_port], f);
}

void VCDTracer::TraceChannelEnd(std::string const &, int, int, int, int, Flit const *) {}

void VCDTracer::TraceRouterInput(int router, int input, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || router < 0 || router >= _routers ||
     input < 0 || input >= _router_outputs || !ShouldTrace(f)) {
    return;
  }
  if(!ShouldTraceRouter(router)) return;
  _Trace(_router_in[router][input], _router_in_valid_last[router][input], f);
}

void VCDTracer::TraceVCOccupancy(int router, int input, int vc, int occupancy) {
  if(!InTraceWindow(GetSimTime()) || router < 0 || router >= _routers ||
     input < 0 || input >= _router_outputs || vc < 0 || vc >= _vcs) {
    return;
  }
  if(!ShouldTraceRouter(router)) return;
  if(_router_vc_occupancy_last[router][input][vc] == occupancy) {
    return;
  }
  _router_vc_occupancy_last[router][input][vc] = occupancy;
  _Set(_router_vc_occupancy[router][input][vc], occupancy < 0 ? 0 : (unsigned long long)occupancy);
}

// ---- Crossbar (Component 4) ----

void VCDTracer::TraceCrossbarBegin(int router, int input, int output, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || router < 0 || router >= _routers ||
     output < 0 || output >= _router_outputs || !ShouldTrace(f)) {
    return;
  }
  if(!ShouldTraceRouter(router)) return;
  if(_router_crossbar.empty()) return;

  CrossbarSignals & sigs = _router_crossbar[router][output];
  _SetBit(sigs.valid, true);
  _router_crossbar_valid_last[router][output] = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.input, input < 0 ? 0 : (unsigned long long)input);
  _Set(sigs.output, output < 0 ? 0 : (unsigned long long)output);
  _Set(sigs.vc, f->vc < 0 ? 0 : (unsigned long long)f->vc);
}

void VCDTracer::TraceCrossbarEnd(int router, int input, int output, Flit const * f) {
  // Crossbar end — we already recorded begin; nothing extra needed
}

// ---- VC State (Component 1) ----

void VCDTracer::TraceVCState(int router, int input, int vc, int state,
                             int front_flit_id, int front_packet_id,
                             int out_port, int out_vc) {
  if(!_trace_vc || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs ||
     vc < 0 || vc >= _vcs) return;
  if(!ShouldTraceRouter(router)) return;
  if(_router_vc_signals.empty()) return;

  VCSignals const & sigs = _router_vc_signals[router][input][vc];
  bool changed = false;

  if(_router_vc_state_last[router][input][vc] != state) {
    _router_vc_state_last[router][input][vc] = state;
    _Set(sigs.state, (unsigned long long)state);
    changed = true;
  }
  if(_router_vc_front_flit_last[router][input][vc] != front_flit_id) {
    _router_vc_front_flit_last[router][input][vc] = front_flit_id;
    _Set(sigs.front_flit, front_flit_id < 0 ? 0 : (unsigned long long)front_flit_id);
    if(front_packet_id >= 0) {
      _Set(sigs.front_packet, (unsigned long long)front_packet_id);
    }
    changed = true;
  }
  if(_router_vc_out_port_last[router][input][vc] != out_port) {
    _router_vc_out_port_last[router][input][vc] = out_port;
    _Set(sigs.out_port, out_port < 0 ? 0 : (unsigned long long)out_port);
    changed = true;
  }
  if(_router_vc_out_vc_last[router][input][vc] != out_vc) {
    _router_vc_out_vc_last[router][input][vc] = out_vc;
    _Set(sigs.out_vc, out_vc < 0 ? 0 : (unsigned long long)out_vc);
    changed = true;
  }
  (void)changed; // suppress unused warning
}

// ---- Pipeline Tracing (Component 2) ----

void VCDTracer::TracePipelineBW(int router, int input, int vc, Flit const * f) {
  if(!_trace_pipeline || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs) return;
  if(!ShouldTraceRouter(router) || !ShouldTrace(f)) return;
  if(_router_pipeline.empty()) return;

  PipelineSignals & sigs = _router_pipeline[router][STAGE_BW][input];
  _SetBit(sigs.valid, true);
  _router_pipeline_valid_last[router][STAGE_BW][input] = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, vc < 0 ? 0 : (unsigned long long)vc);
  _Set(sigs.result, (unsigned long long)PIPE_SUCCESS);
}

void VCDTracer::TracePipelineRC(int router, int input, int vc, Flit const * f, bool complete) {
  if(!_trace_pipeline || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs) return;
  if(!ShouldTraceRouter(router) || !ShouldTrace(f)) return;
  if(_router_pipeline.empty()) return;

  PipelineSignals & sigs = _router_pipeline[router][STAGE_RC][input];
  _SetBit(sigs.valid, true);
  _router_pipeline_valid_last[router][STAGE_RC][input] = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, vc < 0 ? 0 : (unsigned long long)vc);
  _Set(sigs.result, complete ? (unsigned long long)PIPE_SUCCESS : (unsigned long long)PIPE_NONE);
}

void VCDTracer::TracePipelineVA(int router, int input, int vc, Flit const * f, int result, int out_port, int out_vc_val) {
  if(!_trace_pipeline || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs) return;
  if(!ShouldTraceRouter(router) || !ShouldTrace(f)) return;
  if(_router_pipeline.empty()) return;

  PipelineSignals & sigs = _router_pipeline[router][STAGE_VA][input];
  _SetBit(sigs.valid, true);
  _router_pipeline_valid_last[router][STAGE_VA][input] = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, vc < 0 ? 0 : (unsigned long long)vc);
  _Set(sigs.output, out_port < 0 ? 0 : (unsigned long long)out_port);
  _Set(sigs.out_vc, out_vc_val < 0 ? 0 : (unsigned long long)out_vc_val);
  _Set(sigs.result, (unsigned long long)result);
}

void VCDTracer::TracePipelineSA(int router, int input, int vc, Flit const * f, int result, int out_port) {
  if(!_trace_pipeline || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs) return;
  if(!ShouldTraceRouter(router) || !ShouldTrace(f)) return;
  if(_router_pipeline.empty()) return;

  PipelineSignals & sigs = _router_pipeline[router][STAGE_SA][input];
  _SetBit(sigs.valid, true);
  _router_pipeline_valid_last[router][STAGE_SA][input] = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, vc < 0 ? 0 : (unsigned long long)vc);
  _Set(sigs.output, out_port < 0 ? 0 : (unsigned long long)out_port);
  _Set(sigs.result, (unsigned long long)result);
}

void VCDTracer::TracePipelineST(int router, int input, int output, Flit const * f, bool begin) {
  if(!_trace_pipeline || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || input < 0 || input >= _router_outputs) return;
  if(!ShouldTraceRouter(router) || !ShouldTrace(f)) return;
  if(_router_pipeline.empty()) return;

  PipelineSignals & sigs = _router_pipeline[router][STAGE_ST][input];
  _SetBit(sigs.valid, begin);
  if (begin) _router_pipeline_valid_last[router][STAGE_ST][input] = true;
  if(begin) {
    _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
    _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
    _Set(sigs.vc, f->vc < 0 ? 0 : (unsigned long long)f->vc);
    _Set(sigs.output, output < 0 ? 0 : (unsigned long long)output);
    _Set(sigs.result, (unsigned long long)PIPE_SUCCESS);
  }
}

// ---- Downstream Credits (Component 5) ----

void VCDTracer::TraceDownstreamCredits(int router, int output, int vc, int occupancy, int available, int limit) {
  if(!_trace_credits || !InTraceWindow(GetSimTime())) return;
  if(router < 0 || router >= _routers || output < 0 || output >= _router_outputs ||
     vc < 0 || vc >= _vcs) return;
  if(!ShouldTraceRouter(router)) return;
  if(_router_ds_occupancy.empty()) return;

  if(_router_ds_occupancy_last[router][output][vc] != occupancy) {
    _router_ds_occupancy_last[router][output][vc] = occupancy;
    _Set(_router_ds_occupancy[router][output][vc], occupancy < 0 ? 0 : (unsigned long long)occupancy);
  }
  if(_router_ds_available_last[router][output][vc] != available) {
    _router_ds_available_last[router][output][vc] = available;
    _Set(_router_ds_available[router][output][vc], available < 0 ? 0 : (unsigned long long)available);
  }
  (void)limit; // limit is static, not traced per cycle
}

// ---- ID allocation ----

std::string VCDTracer::_AllocId() {
  static const char alphabet[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}:,.<>/?";
  const int base = sizeof(alphabet) - 1;
  int value = _next_id++;
  std::string id;
  do {
    id += alphabet[value % base];
    value /= base;
  } while(value > 0);
  return id;
}

std::string VCDTracer::_Register(std::string const & name, int width) {
  std::string id = _AllocId();
  std::ostringstream ss;
  ss << "$var wire " << width << " " << id << " " << name << " $end\n";
  _Write(ss.str());
  return id;
}

std::string VCDTracer::_RegisterInteger(std::string const & name, int width) {
  std::string id = _AllocId();
  std::ostringstream ss;
  ss << "$var integer " << width << " " << id << " " << name << " $end\n";
  _Write(ss.str());
  return id;
}

// ---- Header ----

void VCDTracer::_WriteHeader() {
  time_t now = time(0);
  std::ostringstream header;
  header << "$date " << ctime(&now) << " $end\n";
  header << "$version BookSim architectural VCD tracer $end\n";
  header << "$timescale 1ns $end\n";
  header << "$scope module booksim $end\n";
  _Write(header.str());

  _cycle_id = _RegisterInteger("cycle", 32);

  // Node generation signals
  _node_gen.resize(_nodes);
  _node_gen_valid_last.assign(_nodes, false);
  for(int node = 0; node < _nodes; ++node) {
    std::ostringstream prefix;
    prefix << "node_" << node << ".gen";
    _node_gen[node].valid = _Register(prefix.str() + ".valid", 1);
    _node_gen[node].packet = _RegisterInteger(prefix.str() + ".packet_id", 32);
    _node_gen[node].src = _RegisterInteger(prefix.str() + ".src", 32);
    _node_gen[node].dest = _RegisterInteger(prefix.str() + ".dest", 32);
    _node_gen[node].flit_id_start = _RegisterInteger(prefix.str() + ".flit_id_start", 32);
    _node_gen[node].flit_id_end = _RegisterInteger(prefix.str() + ".flit_id_end", 32);
  }

  // Node injection link signals
  _node_link.resize(_nodes);
  _node_link_valid_last.assign(_nodes, false);
  for(int node = 0; node < _nodes; ++node) {
    std::ostringstream prefix;
    prefix << "node_" << node << ".link";
    _node_link[node].valid = _Register(prefix.str() + ".valid", 1);
    _node_link[node].flit = _RegisterInteger(prefix.str() + ".flit_id", 32);
    _node_link[node].packet = _RegisterInteger(prefix.str() + ".packet_id", 32);
    _node_link[node].vc = _RegisterInteger(prefix.str() + ".vc", 32);
    _node_link[node].src = _RegisterInteger(prefix.str() + ".src", 32);
    _node_link[node].dest = _RegisterInteger(prefix.str() + ".dest", 32);
    _node_link[node].head = _Register(prefix.str() + ".head", 1);
    _node_link[node].tail = _Register(prefix.str() + ".tail", 1);
  }

  // Node inject/eject signals (Component 4)
  _node_inject.resize(_nodes);
  _node_inject_valid_last.assign(_nodes, false);
  _node_eject.resize(_nodes);
  _node_eject_valid_last.assign(_nodes, false);
  for(int node = 0; node < _nodes; ++node) {
    {
      std::ostringstream prefix;
      prefix << "node_" << node << ".inject";
      _node_inject[node].valid = _Register(prefix.str() + ".valid", 1);
      _node_inject[node].flit = _RegisterInteger(prefix.str() + ".flit_id", 16);
      _node_inject[node].packet = _RegisterInteger(prefix.str() + ".packet_id", 16);
      _node_inject[node].vc = _RegisterInteger(prefix.str() + ".vc", 4);
      _node_inject[node].src = _RegisterInteger(prefix.str() + ".src", 8);
      _node_inject[node].dest = _RegisterInteger(prefix.str() + ".dest", 8);
    }
    {
      std::ostringstream prefix;
      prefix << "node_" << node << ".eject";
      _node_eject[node].valid = _Register(prefix.str() + ".valid", 1);
      _node_eject[node].flit = _RegisterInteger(prefix.str() + ".flit_id", 16);
      _node_eject[node].packet = _RegisterInteger(prefix.str() + ".packet_id", 16);
      _node_eject[node].vc = _RegisterInteger(prefix.str() + ".vc", 4);
      _node_eject[node].src = _RegisterInteger(prefix.str() + ".src", 8);
      _node_eject[node].dest = _RegisterInteger(prefix.str() + ".dest", 8);
    }
  }

  // Router signals
  _router_in.resize(_routers);
  _router_in_valid_last.resize(_routers);
  _router_link.resize(_routers);
  _router_link_valid_last.resize(_routers);
  _router_vc_occupancy.resize(_routers);
  _router_vc_occupancy_last.resize(_routers);
  _router_crossbar.resize(_routers);
  _router_crossbar_valid_last.resize(_routers);

  if(_trace_vc) {
    _router_vc_signals.resize(_routers);
    _router_vc_state_last.resize(_routers);
    _router_vc_front_flit_last.resize(_routers);
    _router_vc_out_port_last.resize(_routers);
    _router_vc_out_vc_last.resize(_routers);
  }
  if(_trace_pipeline) {
    _router_pipeline.resize(_routers);
    _router_pipeline_valid_last.resize(_routers);
  }
  if(_trace_credits) {
    _router_ds_occupancy.resize(_routers);
    _router_ds_available.resize(_routers);
    _router_ds_occupancy_last.resize(_routers);
    _router_ds_available_last.resize(_routers);
  }

  for(int router = 0; router < _routers; ++router) {
    bool trace_this = ShouldTraceRouter(router);

    _router_in[router].resize(_router_outputs);
    _router_in_valid_last[router].assign(_router_outputs, false);
    _router_link[router].resize(_router_outputs);
    _router_link_valid_last[router].assign(_router_outputs, false);
    _router_vc_occupancy[router].resize(_router_outputs);
    _router_vc_occupancy_last[router].resize(_router_outputs);
    _router_crossbar[router].resize(_router_outputs);
    _router_crossbar_valid_last[router].assign(_router_outputs, false);

    if(_trace_vc && trace_this) {
      _router_vc_signals[router].resize(_router_outputs);
      _router_vc_state_last[router].resize(_router_outputs);
      _router_vc_front_flit_last[router].resize(_router_outputs);
      _router_vc_out_port_last[router].resize(_router_outputs);
      _router_vc_out_vc_last[router].resize(_router_outputs);
    }
    if(_trace_pipeline && trace_this) {
      _router_pipeline[router].resize(NUM_STAGES);
      _router_pipeline_valid_last[router].resize(NUM_STAGES);
      for(int stage = 0; stage < NUM_STAGES; ++stage) {
        _router_pipeline[router][stage].resize(_router_outputs);
        _router_pipeline_valid_last[router][stage].assign(_router_outputs, false);
      }
    }
    if(_trace_credits && trace_this) {
      _router_ds_occupancy[router].resize(_router_outputs);
      _router_ds_available[router].resize(_router_outputs);
      _router_ds_occupancy_last[router].resize(_router_outputs);
      _router_ds_available_last[router].resize(_router_outputs);
    }

    for(int output = 0; output < _router_outputs; ++output) {
      _router_vc_occupancy[router][output].resize(_vcs);
      _router_vc_occupancy_last[router][output].resize(_vcs, -1);

      if(trace_this) {
        // VC occupancy signals (existing)
        for(int vc = 0; vc < _vcs; ++vc) {
          std::ostringstream vc_prefix;
          vc_prefix << "router_" << router << ".in_" << output << ".vc_" << vc;
          _router_vc_occupancy[router][output][vc] = _RegisterInteger(vc_prefix.str() + ".occupancy", 32);
        }

        // VC state signals (Component 1)
        if(_trace_vc) {
          _router_vc_signals[router][output].resize(_vcs);
          _router_vc_state_last[router][output].resize(_vcs, -99);
          _router_vc_front_flit_last[router][output].resize(_vcs, -99);
          _router_vc_out_port_last[router][output].resize(_vcs, -99);
          _router_vc_out_vc_last[router][output].resize(_vcs, -99);
          for(int vc = 0; vc < _vcs; ++vc) {
            std::ostringstream vc_prefix;
            vc_prefix << "router_" << router << ".in_" << output << ".vc_" << vc;
            _router_vc_signals[router][output][vc].state = _Register(vc_prefix.str() + ".state", 2);
            _router_vc_signals[router][output][vc].front_flit = _RegisterInteger(vc_prefix.str() + ".front_flit", 16);
            _router_vc_signals[router][output][vc].front_packet = _RegisterInteger(vc_prefix.str() + ".front_pkt", 16);
            _router_vc_signals[router][output][vc].out_port = _RegisterInteger(vc_prefix.str() + ".out_port", 8);
            _router_vc_signals[router][output][vc].out_vc = _RegisterInteger(vc_prefix.str() + ".out_vc", 8);
          }
        }

        // Router input signals
        std::ostringstream in_prefix;
        in_prefix << "router_" << router << ".in_" << output;
        _router_in[router][output].valid = _Register(in_prefix.str() + ".valid", 1);
        _router_in[router][output].flit = _RegisterInteger(in_prefix.str() + ".flit_id", 32);
        _router_in[router][output].packet = _RegisterInteger(in_prefix.str() + ".packet_id", 32);
        _router_in[router][output].vc = _RegisterInteger(in_prefix.str() + ".vc", 32);
        _router_in[router][output].src = _RegisterInteger(in_prefix.str() + ".src", 32);
        _router_in[router][output].dest = _RegisterInteger(in_prefix.str() + ".dest", 32);
        _router_in[router][output].head = _Register(in_prefix.str() + ".head", 1);
        _router_in[router][output].tail = _Register(in_prefix.str() + ".tail", 1);

        // Router link (output) signals
        std::ostringstream prefix;
        prefix << "router_" << router << ".link_" << output;
        _router_link[router][output].valid = _Register(prefix.str() + ".valid", 1);
        _router_link[router][output].flit = _RegisterInteger(prefix.str() + ".flit_id", 32);
        _router_link[router][output].packet = _RegisterInteger(prefix.str() + ".packet_id", 32);
        _router_link[router][output].vc = _RegisterInteger(prefix.str() + ".vc", 32);
        _router_link[router][output].src = _RegisterInteger(prefix.str() + ".src", 32);
        _router_link[router][output].dest = _RegisterInteger(prefix.str() + ".dest", 32);
        _router_link[router][output].head = _Register(prefix.str() + ".head", 1);
        _router_link[router][output].tail = _Register(prefix.str() + ".tail", 1);

        // Crossbar signals (Component 4)
        {
          std::ostringstream xbar_prefix;
          xbar_prefix << "router_" << router << ".xbar.out_" << output;
          _router_crossbar[router][output].valid = _Register(xbar_prefix.str() + ".valid", 1);
          _router_crossbar[router][output].flit = _RegisterInteger(xbar_prefix.str() + ".flit_id", 16);
          _router_crossbar[router][output].packet = _RegisterInteger(xbar_prefix.str() + ".packet_id", 16);
          _router_crossbar[router][output].input = _RegisterInteger(xbar_prefix.str() + ".input", 4);
          _router_crossbar[router][output].output = _RegisterInteger(xbar_prefix.str() + ".output", 4);
          _router_crossbar[router][output].vc = _RegisterInteger(xbar_prefix.str() + ".vc", 4);
        }

        // Downstream credit signals (Component 5)
        if(_trace_credits) {
          _router_ds_occupancy[router][output].resize(_vcs);
          _router_ds_available[router][output].resize(_vcs);
          _router_ds_occupancy_last[router][output].resize(_vcs, -1);
          _router_ds_available_last[router][output].resize(_vcs, -1);
          for(int vc = 0; vc < _vcs; ++vc) {
            std::ostringstream ds_prefix;
            ds_prefix << "router_" << router << ".ds.out_" << output << ".vc_" << vc;
            _router_ds_occupancy[router][output][vc] = _RegisterInteger(ds_prefix.str() + ".occupancy", 8);
            _router_ds_available[router][output][vc] = _RegisterInteger(ds_prefix.str() + ".available", 8);
          }
        }
      } else {
        // Non-traced router: register dummy signals (needed for consistent indexing)
        for(int vc = 0; vc < _vcs; ++vc) {
          std::ostringstream vc_prefix;
          vc_prefix << "router_" << router << ".in_" << output << ".vc_" << vc;
          _router_vc_occupancy[router][output][vc] = _RegisterInteger(vc_prefix.str() + ".occupancy", 32);
        }

        std::ostringstream in_prefix;
        in_prefix << "router_" << router << ".in_" << output;
        _router_in[router][output].valid = _Register(in_prefix.str() + ".valid", 1);
        _router_in[router][output].flit = _RegisterInteger(in_prefix.str() + ".flit_id", 32);
        _router_in[router][output].packet = _RegisterInteger(in_prefix.str() + ".packet_id", 32);
        _router_in[router][output].vc = _RegisterInteger(in_prefix.str() + ".vc", 32);
        _router_in[router][output].src = _RegisterInteger(in_prefix.str() + ".src", 32);
        _router_in[router][output].dest = _RegisterInteger(in_prefix.str() + ".dest", 32);
        _router_in[router][output].head = _Register(in_prefix.str() + ".head", 1);
        _router_in[router][output].tail = _Register(in_prefix.str() + ".tail", 1);

        std::ostringstream prefix;
        prefix << "router_" << router << ".link_" << output;
        _router_link[router][output].valid = _Register(prefix.str() + ".valid", 1);
        _router_link[router][output].flit = _RegisterInteger(prefix.str() + ".flit_id", 32);
        _router_link[router][output].packet = _RegisterInteger(prefix.str() + ".packet_id", 32);
        _router_link[router][output].vc = _RegisterInteger(prefix.str() + ".vc", 32);
        _router_link[router][output].src = _RegisterInteger(prefix.str() + ".src", 32);
        _router_link[router][output].dest = _RegisterInteger(prefix.str() + ".dest", 32);
        _router_link[router][output].head = _Register(prefix.str() + ".head", 1);
        _router_link[router][output].tail = _Register(prefix.str() + ".tail", 1);
      }
    }

    // Pipeline signals (Component 2) — per stage, per input
    if(_trace_pipeline && trace_this) {
      static const char * stage_names[] = {"BW", "RC", "VA", "SA", "ST"};
      for(int stage = 0; stage < NUM_STAGES; ++stage) {
        for(int inp = 0; inp < _router_outputs; ++inp) {
          std::ostringstream pipe_prefix;
          pipe_prefix << "router_" << router << ".pipe." << stage_names[stage] << ".in_" << inp;
          PipelineSignals & ps = _router_pipeline[router][stage][inp];
          ps.valid = _Register(pipe_prefix.str() + ".valid", 1);
          ps.flit = _RegisterInteger(pipe_prefix.str() + ".flit_id", 16);
          ps.packet = _RegisterInteger(pipe_prefix.str() + ".packet_id", 16);
          ps.vc = _RegisterInteger(pipe_prefix.str() + ".vc", 4);
          ps.output = _RegisterInteger(pipe_prefix.str() + ".output", 4);
          ps.out_vc = _RegisterInteger(pipe_prefix.str() + ".out_vc", 4);
          ps.result = _RegisterInteger(pipe_prefix.str() + ".result", 3);
        }
      }
    }
  }

  _Write("$upscope $end\n");
  _Write("$enddefinitions $end\n");
}

// ---- Time / Value writers ----

void VCDTracer::_Time(long long time) {
  if(time != _last_time) {
    std::ostringstream ss;
    ss << "#" << time << "\n";
    _Write(ss.str());
    _last_time = time;
  }
}

void VCDTracer::_Set(std::string const & id, unsigned long long value) {
  if(id.empty()) return;
  std::unordered_map<std::string, unsigned long long>::iterator it = _last_values.find(id);
  if(it != _last_values.end() && it->second == value) {
    return;
  }
  _last_values[id] = value;
  
  std::ostringstream ss;
  if(value == 0) {
    ss << "b0 " << id << "\n";
  } else {
    char bits[65];
    int idx = 0;
    unsigned long long v = value;
    while(v > 0) {
      bits[idx++] = (v & 1) ? '1' : '0';
      v >>= 1;
    }
    ss << "b";
    for(int i = idx - 1; i >= 0; --i) {
      ss << bits[i];
    }
    ss << " " << id << "\n";
  }
  _Write(ss.str());
}

void VCDTracer::_SetBit(std::string const & id, bool value) {
  if(id.empty()) return;
  unsigned long long v = value ? 1 : 0;
  std::unordered_map<std::string, unsigned long long>::iterator it = _last_values.find(id);
  if(it != _last_values.end() && it->second == v) {
    return;
  }
  _last_values[id] = v;

  std::ostringstream ss;
  ss << (value ? '1' : '0') << id << "\n";
  _Write(ss.str());
}

// ---- Clear overloads ----

void VCDTracer::_Clear(PacketGenSignals const & sigs, char & valid_last) {
  if(valid_last) {
    _SetBit(sigs.valid, false);
    valid_last = 0;
  }
}

void VCDTracer::_Clear(LinkSignals const & sigs, char & valid_last) {
  if(valid_last) {
    _SetBit(sigs.valid, false);
    valid_last = 0;
  }
}

void VCDTracer::_Clear(InjectEjectSignals const & sigs, char & valid_last) {
  if(valid_last) {
    _SetBit(sigs.valid, false);
    valid_last = 0;
  }
}

void VCDTracer::_Clear(CrossbarSignals const & sigs, char & valid_last) {
  if(valid_last) {
    _SetBit(sigs.valid, false);
    valid_last = 0;
  }
}

void VCDTracer::_Clear(PipelineSignals const & sigs, char & valid_last) {
  if(valid_last) {
    _SetBit(sigs.valid, false);
    valid_last = 0;
  }
}

// ---- Trace helpers ----

void VCDTracer::_Trace(PacketGenSignals const & sigs, char & valid_last, int packet_id, int src, int dest,
                       int flit_id_start, int flit_id_end) {
  _SetBit(sigs.valid, true);
  valid_last = true;
  _Set(sigs.packet, packet_id < 0 ? 0 : (unsigned long long)packet_id);
  _Set(sigs.src, src < 0 ? 0 : (unsigned long long)src);
  _Set(sigs.dest, dest < 0 ? 0 : (unsigned long long)dest);
  _Set(sigs.flit_id_start, flit_id_start < 0 ? 0 : (unsigned long long)flit_id_start);
  _Set(sigs.flit_id_end, flit_id_end < 0 ? 0 : (unsigned long long)flit_id_end);
}

void VCDTracer::_Trace(LinkSignals const & sigs, char & valid_last, Flit const * f) {
  int src = f->src;
  int dest = f->dest;
  std::map<int, int>::const_iterator src_iter = _packet_src.find(f->pid);
  if(src_iter != _packet_src.end()) {
    src = src_iter->second;
  }
  std::map<int, int>::const_iterator dest_iter = _packet_dest.find(f->pid);
  if(dest_iter != _packet_dest.end()) {
    dest = dest_iter->second;
  }

  _SetBit(sigs.valid, true);
  valid_last = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, f->vc < 0 ? 0 : (unsigned long long)f->vc);
  _Set(sigs.src, src < 0 ? 0 : (unsigned long long)src);
  _Set(sigs.dest, dest < 0 ? 0 : (unsigned long long)dest);
  _SetBit(sigs.head, f->head);
  _SetBit(sigs.tail, f->tail);
}

void VCDTracer::_Trace(InjectEjectSignals const & sigs, char & valid_last, Flit const * f) {
  int src = f->src;
  int dest = f->dest;
  std::map<int, int>::const_iterator src_iter = _packet_src.find(f->pid);
  if(src_iter != _packet_src.end()) {
    src = src_iter->second;
  }
  std::map<int, int>::const_iterator dest_iter = _packet_dest.find(f->pid);
  if(dest_iter != _packet_dest.end()) {
    dest = dest_iter->second;
  }

  _SetBit(sigs.valid, true);
  valid_last = true;
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, f->vc < 0 ? 0 : (unsigned long long)f->vc);
  _Set(sigs.src, src < 0 ? 0 : (unsigned long long)src);
  _Set(sigs.dest, dest < 0 ? 0 : (unsigned long long)dest);
}
