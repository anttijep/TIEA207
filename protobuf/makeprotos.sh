protoc --js_out=import_style=commonjs,binary:. testprotocol.proto
mv testprotocol_pb.js ../kartta
protoc --python_out=. testprotocol.proto
mv testprotocol_pb2.py ../server
