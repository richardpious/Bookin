#ifndef _ALLOCATOR_HPP_
#define _ALLOCATOR_HPP_

#include <string>
#include <map>
#include <set>
#include <vector>

#include "module.hpp"
#include "config_utils.hpp"

class Allocator : public Module {
protected:
  const int _inputs;
  const int _outputs;

  bool _dirty;

  vector<int> _inmatch;
  vector<int> _outmatch;

public:

  struct sRequest {
    int port;
    int label;
    int in_pri;
    int out_pri;
  };

  Allocator( Module *parent, const string& name,
	     int inputs, int outputs );

  virtual void Clear( );
  
  virtual int  ReadRequest( int in, int out ) const = 0;
  virtual bool ReadRequest( sRequest &req, int in, int out ) const = 0;

  virtual void AddRequest( int in, int out, int label = 1, 
			   int in_pri = 0, int out_pri = 0 );
  virtual void RemoveRequest( int in, int out, int label = 1 ) = 0;
  
  virtual void Allocate( ) = 0;

  int OutputAssigned( int in ) const;
  int InputAssigned( int out ) const;

  virtual bool OutputHasRequests( int out ) const = 0;
  virtual bool InputHasRequests( int in ) const = 0;

  virtual int NumOutputRequests( int out ) const = 0;
  virtual int NumInputRequests( int in ) const = 0;

  virtual void PrintRequests( ostream * os = NULL ) const = 0;
  void PrintGrants( ostream * os = NULL ) const;

  static Allocator *NewAllocator( Module *parent, const string& name,
				  const string &alloc_type, 
				  int inputs, int outputs, 
				  Configuration const * const config = NULL );
};

//==================================================
// A dense allocator stores the entire request
// matrix.
//==================================================

class DenseAllocator : public Allocator {
protected:
  vector<vector<sRequest> > _request;

public:
  DenseAllocator( Module *parent, const string& name,
		  int inputs, int outputs );

  void Clear( );
  
  int  ReadRequest( int in, int out ) const;
  bool ReadRequest( sRequest &req, int in, int out ) const;

  void AddRequest( int in, int out, int label = 1, 
		   int in_pri = 0, int out_pri = 0 );
  void RemoveRequest( int in, int out, int label = 1 );

  bool OutputHasRequests( int out ) const;
  bool InputHasRequests( int in ) const;

  int NumOutputRequests( int out ) const;
  int NumInputRequests( int in ) const;

  void PrintRequests( ostream * os = NULL ) const;

};

//==================================================
// A sparse allocator only stores the requests
// (allows for a more efficient implementation).
//==================================================

class SparseAllocator : public Allocator {
protected:
  set<int> _in_occ;
  set<int> _out_occ;
  
  vector<map<int, sRequest> > _in_req;
  vector<map<int, sRequest> > _out_req;

public:
  SparseAllocator( Module *parent, const string& name,
		   int inputs, int outputs );

  void Clear( );
  
  int  ReadRequest( int in, int out ) const;
  bool ReadRequest( sRequest &req, int in, int out ) const;

  void AddRequest( int in, int out, int label = 1, 
		   int in_pri = 0, int out_pri = 0 );
  void RemoveRequest( int in, int out, int label = 1 );
  
  bool OutputHasRequests( int out ) const;
  bool InputHasRequests( int in ) const;

  int NumOutputRequests( int out ) const;
  int NumInputRequests( int in ) const;

  void PrintRequests( ostream * os = NULL ) const;

};

#endif
