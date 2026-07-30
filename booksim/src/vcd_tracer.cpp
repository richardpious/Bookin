#include "vcd_tracer.hpp"

#include <algorithm>
#include <cassert>
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
    _next_id(0),
    _last_time(-1) {
  if(!_enabled) {
    return;
  }

  std::string file = config.GetStr("vcd_trace_file");
  if(file.empty()) {
    file = "booksim.vcd";
  }
  _out.open(file.c_str());
  if(!_out) {
    _enabled = false;
    return;
  }
  _WriteHeader();
}

VCDTracer::~VCDTracer() {
  if(_out.is_open()) {
    _out.close();
  }
}

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

void VCDTracer::Cycle(int cycle) {
  if(!InTraceWindow(cycle)) {
    return;
  }
  _Time(cycle);
  _Set("cycle", cycle);
  for(int node = 0; node < _nodes; ++node) {
    _Clear(_node_gen[node]);
    _Clear(_node_link[node]);
  }
  for(int router = 0; router < _routers; ++router) {
    for(int port = 0; port < _router_outputs; ++port) {
      _Clear(_router_in[router][port]);
      _Clear(_router_link[router][port]);
    }
  }
}

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
  _Trace(_node_gen[node], packet_id, src, dest, flit_id_start, flit_id_end);
}

void VCDTracer::TraceRouterOutput(int router, int output, Flit const * f) {
}

void VCDTracer::TraceInject(int, int, Flit const *) {}
void VCDTracer::TraceEject(int, int, Flit const *) {}
void VCDTracer::TraceChannelBegin(std::string const &, int source_router, int source_port, int sink_router, int, int, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || sink_router < 0 || !ShouldTrace(f)) {
    return;
  }
  if(source_router < 0) {
    int node = f->src;
    if(node < 0 || node >= _nodes) {
      return;
    }
    _Trace(_node_link[node], f);
    return;
  }
  if(source_router >= _routers || source_port < 0 || source_port >= _router_outputs) {
    return;
  }
  _Trace(_router_link[source_router][source_port], f);
}
void VCDTracer::TraceChannelEnd(std::string const &, int, int, int, int, Flit const *) {}
void VCDTracer::TraceRouterInput(int router, int input, Flit const * f) {
  if(!InTraceWindow(GetSimTime()) || router < 0 || router >= _routers ||
     input < 0 || input >= _router_outputs || !ShouldTrace(f)) {
    return;
  }
  _Trace(_router_in[router][input], f);
}
void VCDTracer::TraceVCOccupancy(int router, int input, int vc, int occupancy) {
  if(!InTraceWindow(GetSimTime()) || router < 0 || router >= _routers ||
     input < 0 || input >= _router_outputs || vc < 0 || vc >= _vcs) {
    return;
  }
  if(_router_vc_occupancy_last[router][input][vc] == occupancy) {
    return;
  }
  _router_vc_occupancy_last[router][input][vc] = occupancy;
  _Set(_router_vc_occupancy[router][input][vc], occupancy < 0 ? 0 : (unsigned long long)occupancy);
}
void VCDTracer::TraceCrossbarBegin(int, int, int, Flit const *) {}
void VCDTracer::TraceCrossbarEnd(int, int, int, Flit const *) {}

std::string VCDTracer::_AllocId() {
  static const char alphabet[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:,.<>/?";
  const int base = sizeof(alphabet) - 1;
  int value = _next_id++;
  std::string id;
  do {
    id += alphabet[value % base];
    value /= base;
  } while(value > 0);
  return id;
}

void VCDTracer::_Register(std::string const & name, int width) {
  assert(_ids.count(name) == 0);
  std::string id = _AllocId();
  _ids[name] = id;
  _out << "$var wire " << width << " " << id << " " << name << " $end\n";
}

void VCDTracer::_RegisterInteger(std::string const & name, int width) {
  assert(_ids.count(name) == 0);
  std::string id = _AllocId();
  _ids[name] = id;
  _out << "$var integer " << width << " " << id << " " << name << " $end\n";
}

void VCDTracer::_WriteHeader() {
  time_t now = time(0);
  _out << "$date " << ctime(&now) << " $end\n";
  _out << "$version BookSim architectural VCD tracer $end\n";
  _out << "$timescale 1ns $end\n";
  _out << "$scope module booksim $end\n";

  _RegisterInteger("cycle", 32);

  _node_gen.resize(_nodes);
  for(int node = 0; node < _nodes; ++node) {
    std::ostringstream prefix;
    prefix << "node_" << node << ".gen";
    _node_gen[node].valid = prefix.str() + ".valid";
    _node_gen[node].packet = prefix.str() + ".packet_id";
    _node_gen[node].src = prefix.str() + ".src";
    _node_gen[node].dest = prefix.str() + ".dest";
    _node_gen[node].flit_id_start = prefix.str() + ".flit_id_start";
    _node_gen[node].flit_id_end = prefix.str() + ".flit_id_end";

    _Register(_node_gen[node].valid, 1);
    _RegisterInteger(_node_gen[node].packet, 32);
    _RegisterInteger(_node_gen[node].src, 32);
    _RegisterInteger(_node_gen[node].dest, 32);
    _RegisterInteger(_node_gen[node].flit_id_start, 32);
    _RegisterInteger(_node_gen[node].flit_id_end, 32);
  }

  _node_link.resize(_nodes);
  for(int node = 0; node < _nodes; ++node) {
    std::ostringstream prefix;
    prefix << "node_" << node << ".link";
    _node_link[node].valid = prefix.str() + ".valid";
    _node_link[node].flit = prefix.str() + ".flit_id";
    _node_link[node].packet = prefix.str() + ".packet_id";
    _node_link[node].vc = prefix.str() + ".vc";
    _node_link[node].src = prefix.str() + ".src";
    _node_link[node].dest = prefix.str() + ".dest";
    _node_link[node].head = prefix.str() + ".head";
    _node_link[node].tail = prefix.str() + ".tail";

    _Register(_node_link[node].valid, 1);
    _RegisterInteger(_node_link[node].flit, 32);
    _RegisterInteger(_node_link[node].packet, 32);
    _RegisterInteger(_node_link[node].vc, 32);
    _RegisterInteger(_node_link[node].src, 32);
    _RegisterInteger(_node_link[node].dest, 32);
    _Register(_node_link[node].head, 1);
    _Register(_node_link[node].tail, 1);
  }

  _router_in.resize(_routers);
  _router_link.resize(_routers);
  _router_vc_occupancy.resize(_routers);
  _router_vc_occupancy_last.resize(_routers);
  for(int router = 0; router < _routers; ++router) {
    _router_in[router].resize(_router_outputs);
    _router_link[router].resize(_router_outputs);
    _router_vc_occupancy[router].resize(_router_outputs);
    _router_vc_occupancy_last[router].resize(_router_outputs);
    for(int output = 0; output < _router_outputs; ++output) {
      _router_vc_occupancy[router][output].resize(_vcs);
      _router_vc_occupancy_last[router][output].resize(_vcs, -1);
      for(int vc = 0; vc < _vcs; ++vc) {
        std::ostringstream vc_prefix;
        vc_prefix << "router_" << router << ".in_" << output << ".vc_" << vc;
        _router_vc_occupancy[router][output][vc] = vc_prefix.str() + ".occupancy";
        _RegisterInteger(_router_vc_occupancy[router][output][vc], 32);
      }

      std::ostringstream in_prefix;
      in_prefix << "router_" << router << ".in_" << output;
      _router_in[router][output].valid = in_prefix.str() + ".valid";
      _router_in[router][output].flit = in_prefix.str() + ".flit_id";
      _router_in[router][output].packet = in_prefix.str() + ".packet_id";
      _router_in[router][output].vc = in_prefix.str() + ".vc";
      _router_in[router][output].src = in_prefix.str() + ".src";
      _router_in[router][output].dest = in_prefix.str() + ".dest";
      _router_in[router][output].head = in_prefix.str() + ".head";
      _router_in[router][output].tail = in_prefix.str() + ".tail";

      _Register(_router_in[router][output].valid, 1);
      _RegisterInteger(_router_in[router][output].flit, 32);
      _RegisterInteger(_router_in[router][output].packet, 32);
      _RegisterInteger(_router_in[router][output].vc, 32);
      _RegisterInteger(_router_in[router][output].src, 32);
      _RegisterInteger(_router_in[router][output].dest, 32);
      _Register(_router_in[router][output].head, 1);
      _Register(_router_in[router][output].tail, 1);

      std::ostringstream prefix;
      prefix << "router_" << router << ".link_" << output;
      _router_link[router][output].valid = prefix.str() + ".valid";
      _router_link[router][output].flit = prefix.str() + ".flit_id";
      _router_link[router][output].packet = prefix.str() + ".packet_id";
      _router_link[router][output].vc = prefix.str() + ".vc";
      _router_link[router][output].src = prefix.str() + ".src";
      _router_link[router][output].dest = prefix.str() + ".dest";
      _router_link[router][output].head = prefix.str() + ".head";
      _router_link[router][output].tail = prefix.str() + ".tail";

      _Register(_router_link[router][output].valid, 1);
      _RegisterInteger(_router_link[router][output].flit, 32);
      _RegisterInteger(_router_link[router][output].packet, 32);
      _RegisterInteger(_router_link[router][output].vc, 32);
      _RegisterInteger(_router_link[router][output].src, 32);
      _RegisterInteger(_router_link[router][output].dest, 32);
      _Register(_router_link[router][output].head, 1);
      _Register(_router_link[router][output].tail, 1);
    }
  }

  _out << "$upscope $end\n";
  _out << "$enddefinitions $end\n";
}

void VCDTracer::_Time(long long time) {
  if(time != _last_time) {
    _out << "#" << time << "\n";
    _last_time = time;
  }
}

void VCDTracer::_Set(std::string const & name, unsigned long long value) {
  std::map<std::string, std::string>::const_iterator iter = _ids.find(name);
  assert(iter != _ids.end());
  if(value == 0) {
    _out << "b0 " << iter->second << "\n";
    return;
  }
  std::string bits;
  while(value > 0) {
    bits += (value & 1) ? '1' : '0';
    value >>= 1;
  }
  std::reverse(bits.begin(), bits.end());
  _out << "b" << bits << " " << iter->second << "\n";
}

void VCDTracer::_SetBit(std::string const & name, bool value) {
  std::map<std::string, std::string>::const_iterator iter = _ids.find(name);
  assert(iter != _ids.end());
  _out << (value ? '1' : '0') << iter->second << "\n";
}

void VCDTracer::_Clear(PacketGenSignals const & sigs) {
  _SetBit(sigs.valid, false);
}

void VCDTracer::_Clear(LinkSignals const & sigs) {
  _SetBit(sigs.valid, false);
}

void VCDTracer::_Trace(PacketGenSignals const & sigs, int packet_id, int src, int dest,
                       int flit_id_start, int flit_id_end) {
  _SetBit(sigs.valid, true);
  _Set(sigs.packet, packet_id < 0 ? 0 : (unsigned long long)packet_id);
  _Set(sigs.src, src < 0 ? 0 : (unsigned long long)src);
  _Set(sigs.dest, dest < 0 ? 0 : (unsigned long long)dest);
  _Set(sigs.flit_id_start, flit_id_start < 0 ? 0 : (unsigned long long)flit_id_start);
  _Set(sigs.flit_id_end, flit_id_end < 0 ? 0 : (unsigned long long)flit_id_end);
}

void VCDTracer::_Trace(LinkSignals const & sigs, Flit const * f) {
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
  _Set(sigs.flit, f->id < 0 ? 0 : (unsigned long long)f->id);
  _Set(sigs.packet, f->pid < 0 ? 0 : (unsigned long long)f->pid);
  _Set(sigs.vc, f->vc < 0 ? 0 : (unsigned long long)f->vc);
  _Set(sigs.src, src < 0 ? 0 : (unsigned long long)src);
  _Set(sigs.dest, dest < 0 ? 0 : (unsigned long long)dest);
  _SetBit(sigs.head, f->head);
  _SetBit(sigs.tail, f->tail);
}
