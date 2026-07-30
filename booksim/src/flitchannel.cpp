// ----------------------------------------------------------------------
//
//  File Name: flitchannel.cpp
//  Author: James Balfour, Rebecca Schultz
//
// ----------------------------------------------------------------------

#include "flitchannel.hpp"

#include <iostream>
#include <iomanip>

#include "router.hpp"
#include "globals.hpp"
#include "vcd_tracer.hpp"

// ----------------------------------------------------------------------
//  $Author: jbalfour $
//  $Date: 2007/06/27 23:10:17 $
//  $Id$
// ----------------------------------------------------------------------
FlitChannel::FlitChannel(Module * parent, string const & name, int classes)
: Channel<Flit>(parent, name), _routerSource(NULL), _routerSourcePort(-1), 
  _routerSink(NULL), _routerSinkPort(-1), _idle(0) {
  _active.resize(classes, 0);
}

void FlitChannel::SetSource(Router const * const router, int port) {
  _routerSource = router;
  _routerSourcePort = port;
}

void FlitChannel::SetSink(Router const * const router, int port) {
  _routerSink = router;
  _routerSinkPort = port;
}

void FlitChannel::Send(Flit * f) {
  if(f) {
    ++_active[f->cl];
  } else {
    ++_idle;
  }
  Channel<Flit>::Send(f);
}

void FlitChannel::ReadInputs() {
  Flit const * const & f = _input;
  if(f && f->watch) {
    *gWatchOut << GetSimTime() << " | " << FullName() << " | "
	       << "Beginning channel traversal for flit " << f->id
	       << " with delay " << _delay
	       << "." << endl;
  }
  int trace_src = f ? f->src : -1;
  int trace_dest = f ? f->dest : -1;
  if(f && gVCDTracer) {
    gVCDTracer->LookupPacket(f->pid, &trace_src, &trace_dest);
  }
  if(gTrace && f && !_routerSource && _routerSink) {
    cout << "Link Traversal: Node " << trace_src
         << " to Router " << _routerSink->GetID() << endl;
    cout << "  FLIT_ID:" << f->id
         << " | PKT_ID:" << f->pid
         << " | VC:" << f->vc
         << " | SRC:" << trace_src
         << " | DEST:" << trace_dest << endl;
  }
  if(gTrace && f && _routerSource && _routerSink) {
    cout << "Link Traversal: Router " << _routerSource->GetID()
         << " to Router " << _routerSink->GetID() << endl;
    cout << "  FLIT_ID:" << f->id
         << " | PKT_ID:" << f->pid
         << " | VC:" << f->vc
         << " | SRC:" << trace_src
         << " | DEST:" << trace_dest << endl;
  }
  if(gVCDTracer && f) {
    int source = _routerSource ? _routerSource->GetID() : -1;
    int sink = _routerSink ? _routerSink->GetID() : -1;
    gVCDTracer->TraceChannelBegin(FullName(), source, _routerSourcePort, sink, _routerSinkPort, _delay, f);
  }
  Channel<Flit>::ReadInputs();
}

void FlitChannel::WriteOutputs() {
  Channel<Flit>::WriteOutputs();
  if(gVCDTracer && _output) {
    int source = _routerSource ? _routerSource->GetID() : -1;
    int sink = _routerSink ? _routerSink->GetID() : -1;
    gVCDTracer->TraceChannelEnd(FullName(), source, _routerSourcePort, sink, _routerSinkPort, _output);
  }
  if(_output && _output->watch) {
    *gWatchOut << GetSimTime() << " | " << FullName() << " | "
	       << "Completed channel traversal for flit " << _output->id
	       << "." << endl;
  }
}
